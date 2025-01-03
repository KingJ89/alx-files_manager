import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as generateUUID } from 'uuid';
import {
  mkdir, writeFile, stat, existsSync, realpath, readFile,
} from 'fs';
import { join as joinPath } from 'path';
import { contentType } from 'mime-types';
import mongoDBCore from 'mongodb/lib/core';
import databaseClient from '../utils/db';
import { getUserFromToken } from '../utils/auth';

const FILE_TYPES = {
  FOLDER: 'folder',
  FILE: 'file',
  IMAGE: 'image',
};

const ROOT_FOLDER = 0;
const DEFAULT_STORAGE_DIR = 'files_manager';
const MAX_PAGE_SIZE = 20;
const THUMBNAIL_QUEUE = new Queue('thumbnail processing');
const EMPTY_ID = Buffer.alloc(24, '0').toString('utf-8');

const asyncMkdir = promisify(mkdir);
const asyncWriteFile = promisify(writeFile);
const asyncStat = promisify(stat);
const asyncRealpath = promisify(realpath);
const asyncReadFile = promisify(readFile);

const isValidObjectId = (id) => {
  const VALID_LENGTH = 24;
  const HEX_CHAR_RANGES = [
    [48, 57], // 0-9
    [97, 102], // a-f
    [65, 70], // A-F
  ];

  if (typeof id !== 'string' || id.length !== VALID_LENGTH) {
    return false;
  }

  return Array.from(id).every((char) =>
    HEX_CHAR_RANGES.some(([start, end]) => char.charCodeAt(0) >= start && char.charCodeAt(0) <= end)
  );
};

export default class FilesController {
  static async uploadFile(req, res) {
    const { user } = req;
    const { name, type, parentId = ROOT_FOLDER, isPublic = false, data: fileData = '' } = req.body || {};

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !Object.values(FILE_TYPES).includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!fileData && type !== FILE_TYPES.FOLDER) return res.status(400).json({ error: 'Missing data' });

    if (parentId !== ROOT_FOLDER) {
      const parent = await (await databaseClient.filesCollection()).findOne({
        _id: new mongoDBCore.BSON.ObjectId(isValidObjectId(parentId) ? parentId : EMPTY_ID),
      });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== FILE_TYPES.FOLDER) return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const userId = user._id.toString();
    const storageDir = process.env.FOLDER_PATH?.trim() || joinPath(tmpdir(), DEFAULT_STORAGE_DIR);
    const fileDetails = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === ROOT_FOLDER ? '0' : new mongoDBCore.BSON.ObjectId(parentId),
    };

    await asyncMkdir(storageDir, { recursive: true });
    if (type !== FILE_TYPES.FOLDER) {
      const localPath = joinPath(storageDir, generateUUID());
      await asyncWriteFile(localPath, Buffer.from(fileData, 'base64'));
      fileDetails.localPath = localPath;
    }

    const insertionResult = await (await databaseClient.filesCollection()).insertOne(fileDetails);
    const fileId = insertionResult.insertedId.toString();

    if (type === FILE_TYPES.IMAGE) {
      const jobName = `Thumbnail generation for [${userId}-${fileId}]`;
      THUMBNAIL_QUEUE.add({ userId, fileId, name: jobName });
    }

    return res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === ROOT_FOLDER ? 0 : parentId,
    });
  }

  static async getFileDetails(req, res) {
    const { user } = req;
    const { id } = req.params || {};
    const userId = user._id.toString();

    const file = await (await databaseClient.filesCollection()).findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidObjectId(id) ? id : EMPTY_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidObjectId(userId) ? userId : EMPTY_ID),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER.toString() ? 0 : file.parentId.toString(),
    });
  }

  static async listFiles(req, res) {
    const { user } = req;
    const parentId = req.query.parentId || ROOT_FOLDER.toString();
    const page = Number.parseInt(req.query.page, 10) || 0;

    const query = {
      userId: user._id,
      parentId: parentId === ROOT_FOLDER.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(isValidObjectId(parentId) ? parentId : EMPTY_ID),
    };

    const files = await (await databaseClient.filesCollection()).aggregate([
      { $match: query },
      { $sort: { _id: -1 } },
      { $skip: page * MAX_PAGE_SIZE },
      { $limit: MAX_PAGE_SIZE },
      {
        $project: {
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: {
            $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
          },
        },
      },
    ]).toArray();

    return res.status(200).json(files);
  }

  static async getFileContent(req, res) {
    const { user } = req;
    const { id } = req.params || {};

    const file = await (await databaseClient.filesCollection()).findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidObjectId(id) ? id : EMPTY_ID),
    });

    if (!file) return res.status(404).json({ error: 'Not found' });

    const isUserOwner = file.userId.toString() === user._id.toString();
    if (!file.isPublic && !isUserOwner) return res.status(404).json({ error: 'Not found' });

    if (file.type === FILE_TYPES.FOLDER) {
      return res.status(400).json({ error: 'A folder does not have content' });
    }

    if (!existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const fileContent = await asyncReadFile(file.localPath);
    const mimeType = contentType(file.name) || 'text/plain; charset=utf-8';

    res.setHeader('Content-Type', mimeType);
    return res.status(200).send(fileContent);
  }

  static async publishFile(req, res, isPublic) {
    const { user } = req;
    const { id } = req.params || {};

    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidObjectId(id) ? id : EMPTY_ID),
      userId: user._id,
    };

    const updateResult = await (await databaseClient.filesCollection()).updateOne(
      fileFilter,
      { $set: { isPublic } },
    );

    if (updateResult.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
