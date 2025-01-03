import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * Controller class for application-level operations.
 */
export default class AppController {
  /**
   * Returns the status of Redis and database connections.
   * @param {Object} req The HTTP request object.
   * @param {Object} res The HTTP response object.
   */
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  /**
   * Retrieves the total counts of users and files in the system.
   * @param {Object} req The HTTP request object.
   * @param {Object} res The HTTP response object.
   */
  static async getStats(req, res) {
    try {
      const [usersCount, filesCount] = await Promise.all([
        dbClient.nbUsers(),
        dbClient.nbFiles(),
      ]);

      res.status(200).json({ users: usersCount, files: filesCount });
    } catch (error) {
      console.error('Error retrieving stats:', error);
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  }
}
