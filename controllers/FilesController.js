import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import {
  mkdir, writeFile, stat, existsSync, realpath,
} from 'fs';
import { join as joinPath } from 'path';
import { contentType } from 'mime-types';
import mongoDBCore from 'mongodb/lib/core';
import clientDb from '../utils/db';
import { getUserFromXToken } from '../utils/auth';

const VALID_FILE_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};
const ROOT_FOLDER_ID = 0;
const DEFAULT_ROOT_FOLDER = 'files_manager';
const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);
const MAX_FILES_PER_PAGE = 20;
const fileQueue = new Queue('thumbnail generation');
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');
const isValidId = (id) => {
  const size = 24;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  return Array.from(id).every((c) => {
    const code = c.charCodeAt(0);
    return charRanges.some((range) => code >= range[0] && code <= range[1]);
  });
};

const handleError = (res, status, message) => {
  res.status(status).json({ error: message });
};

export default class FilesController {
  static async postUpload(req, res) {
    const { user } = req;
    const name = req.body?.name;
    const type = req.body?.type;
    const parentId = req.body?.parentId || ROOT_FOLDER_ID;
    const isPublic = req.body?.isPublic || false;
    const base64Data = req.body?.data || '';

    if (!name) return handleError(res, 400, 'Missing name');
    if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) return handleError(res, 400, 'Missing type');
    if (!req.body?.data && type !== VALID_FILE_TYPES.folder) return handleError(res, 400, 'Missing data');

    if (parentId !== ROOT_FOLDER_ID && parentId !== ROOT_FOLDER_ID.toString()) {
      const file = await clientDb.filesCollection().findOne({
        _id: new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
      });
      if (!file) return handleError(res, 400, 'Parent not found');
      if (file.type !== VALID_FILE_TYPES.folder) return handleError(res, 400, 'Parent is not a folder');
    }

    const userId = user._id.toString();
    const baseDir = process.env.FOLDER_PATH?.trim() || joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === ROOT_FOLDER_ID || parentId === ROOT_FOLDER_ID.toString()
        ? '0'
        : new mongoDBCore.BSON.ObjectId(parentId),
    };

    await mkDirAsync(baseDir, { recursive: true });
    if (type !== VALID_FILE_TYPES.folder) {
      const localPath = joinPath(baseDir, uuidv4());
      await writeFileAsync(localPath, Buffer.from(base64Data, 'base64'));
      newFile.localPath = localPath;
    }

    const insertionInfo = await clientDb.filesCollection().insertOne(newFile);
    const fileId = insertionInfo.insertedId.toString();

    if (type === VALID_FILE_TYPES.image) {
      fileQueue.add({ userId, fileId, name });
    }

    res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === ROOT_FOLDER_ID || parentId === ROOT_FOLDER_ID.toString() ? 0 : parentId,
    });
  }

  static async getShow(req, res) {
    const { user } = req;
    const id = req.params?.id || NULL_ID;
    const userId = user._id.toString();

    const file = await clientDb.filesCollection().findOne({
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    });

    if (!file) return handleError(res, 404, 'Not found');

    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER_ID.toString() ? 0 : file.parentId.toString(),
    });
  }

  static async getIndex(req, res) {
    const { user } = req;
    const parentId = req.query.parentId || ROOT_FOLDER_ID.toString();
    const page = Math.max(0, parseInt(req.query.page, 10) || 0);

    const filesFilter = {
      userId: user._id,
      parentId: parentId === ROOT_FOLDER_ID.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
    };

    const files = await clientDb.filesCollection().aggregate([
      { $match: filesFilter },
      { $sort: { _id: -1 } },
      { $skip: page * MAX_FILES_PER_PAGE },
      { $limit: MAX_FILES_PER_PAGE },
      {
        $project: {
          _id: 0,
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

    res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const { user } = req;
    const { id } = req.params;
    const userId = user._id.toString();

    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };

    const file = await clientDb.filesCollection().findOne(fileFilter);
    if (!file) return handleError(res, 404, 'Not found');

    await clientDb.filesCollection().updateOne(fileFilter, { $set: { isPublic: true } });
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === ROOT_FOLDER_ID.toString() ? 0 : file.parentId.toString(),
    });
  }

  static async putUnpublish(req, res) {
    const { user } = req;
    const { id } = req.params;
    const userId = user._id.toString();

    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };

    const file = await clientDb.filesCollection().findOne(fileFilter);
    if (!file) return handleError(res, 404, 'Not found');

    await clientDb.filesCollection().updateOne(fileFilter, { $set: { isPublic: false } });
    res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file
