import { v4 as uuidv4 } from 'uuid';
import clientRedis from '../utils/redis';

/**
 * Controller handling authentication-related actions.
 */
export default class AuthController {
  /**
   * Establishes a user session and returns a token.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  static async getConnect(req, res) {
    try {
      const { user } = req;
      const token = uuidv4();

      // Store the token in Redis with a 24-hour expiration.
      await clientRedis.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
      res.status(200).json({ token });
    } catch (err) {
      console.error('Error establishing connection:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Terminates a user session by deleting the token.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  static async getDisconnect(req, res) {
    try {
      const token = req.headers['x-token'];

      // Delete the token from Redis.
      await clientRedis.del(`auth_${token}`);
      res.status(204).send();
    } catch (err) {
      console.error('Error disconnecting user:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
