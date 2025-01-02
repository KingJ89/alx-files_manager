import sha1 from 'sha1';
import { Request } from 'express';
import mongoCore from 'mongodb/lib/core';
import customDBClient from './db';
import customRedisClient from './redis';

/**
 * Retrieves the authenticated user based on the Authorization header in the request.
 * @param {Request} request The Express request object.
 * @returns {Promise<{_id: ObjectId, email: string, password: string}>}
 */
export const fetchUserFromAuthHeader = async (request) => {
  const authHeader = request.headers.authorization || null;

  if (!authHeader) {
    return null;
  }
  const authParts = authHeader.split(' ');

  if (authParts.length !== 2 || authParts[0] !== 'Basic') {
    return null;
  }
  const credentials = Buffer.from(authParts[1], 'base64').toString();
  const separatorIndex = credentials.indexOf(':');
  const userEmail = credentials.substring(0, separatorIndex);
  const userPassword = credentials.substring(separatorIndex + 1);
  const user = await (await customDBClient.getUsersCollection()).findOne({ email: userEmail });

  if (!user || sha1(userPassword) !== user.password) {
    return null;
  }
  return user;
};

/**
 * Retrieves the authenticated user based on the X-Token header in the request.
 * @param {Request} request The Express request object.
 * @returns {Promise<{_id: ObjectId, email: string, password: string}>}
 */
export const fetchUserFromXTokenHeader = async (request) => {
  const token = request.headers['x-token'];

  if (!token) {
    return null;
  }
  const userId = await customRedisClient.get(`auth_${token}`);
  if (!userId) {
    return null;
  }
  const user = await (await customDBClient.getUsersCollection())
    .findOne({ _id: new mongoCore.BSON.ObjectId(userId) });
  return user || null;
};

export default {
  fetchUserFromAuthHeader: async (request) => fetchUserFromAuthHeader(request),
  fetchUserFromXTokenHeader: async (request) => fetchUserFromXTokenHeader(request),
};
