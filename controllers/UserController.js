import sha1 from 'sha1';
import Queue from 'bull/lib/queue';
import clientDb from '../utils/db';

const emailQueue = new Queue('emailNotifications');

export default class UserController {
  /**
   * Creates a new user.
   * @param {Request} req - Express request object.
   * @param {Response} res - Express response object.
   */
  static async createUser(req, res) {
    const { email, password } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    try {
      const usersCollection = await clientDb.usersCollection();
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = sha1(password);
      const { insertedId } = await usersCollection.insertOne({ email, password: hashedPassword });

      // Add email notification job to queue
      emailQueue.add({ userId: insertedId.toString() });

      return res.status(201).json({ id: insertedId.toString(), email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Retrieves the currently authenticated user.
   * @param {Request} req - Express request object.
   * @param {Response} res - Express response object.
   */
  static async getCurrentUser(req, res) {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({
      id: user._id.toString(),
      email: user.email,
    });
  }
}
