import { getUserFromXToken, getUserFromAuthorization } from '../utils/auth';

/**
 * Middleware for Basic Authentication.
 * @param {Request} req Express request object.
 * @param {Response} res Express response object.
 * @param {NextFunction} next Express next function.
 */
export const authenticateWithBasic = async (req, res, next) => {
  const authenticatedUser = await getUserFromAuthorization(req);

  if (!authenticatedUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = authenticatedUser;
  next();
};

/**
 * Middleware for X-Token Authentication.
 * @param {Request} req Express request object.
 * @param {Response} res Express response object.
 * @param {NextFunction} next Express next function.
 */
export const authenticateWithXToken = async (req, res, next) => {
  const authenticatedUser = await getUserFromXToken(req);

  if (!authenticatedUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = authenticatedUser;
  next();
};

