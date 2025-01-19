import { v4 as uuidv4 } from 'uuid';
import clientRedis from '../utils/redis';

export default class AuthController {
  /**
   * Connects a user and generates an authentication token.
   * @param {Request} req
   * @param {Response} res
   */
  static async getConnect(req, res) {
    const { user } = req;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = uuidv4();
    try {
      await clientRedis.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Unable to create token', details: error.message });
    }
  }

  /**
   * Disconnects a user by invalidating their authentication token.
   * @param {Request} req
   * @param {Response} res
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await clientRedis.del(`auth_${token}`);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Unable to disconnect', details: error.message });
    }
  }
}
