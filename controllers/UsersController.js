import sha1 from 'sha1';
import Queue from 'bull/lib/queue';
import clientDb from '../utils/db';

const userQueue = new Queue('email sending');

export default class UsersController {
  /**
   * Creates a new user.
   * @param {Request} req
   * @param {Response} res
   */
  static async postNew(req, res) {
    const email = req.body?.email || null;
    const password = req.body?.password || null;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    try {
      const user = await (await clientDb.usersCollection()).findOne({ email });

      if (user) {
        res.status(400).json({ error: 'Already exist' });
        return;
      }

      const insertionInfo = await (await clientDb.usersCollection()).insertOne({
        email,
        password: sha1(password),
      });
      const userId = insertionInfo.insertedId.toString();

      userQueue.add({ userId });
      res.status(201).json({ email, id: userId });
    } catch (error) {
      res.status(500).json({ error: 'Unable to create user', details: error.message });
    }
  }

  /**
   * Retrieves the authenticated user's details.
   * @param {Request} req
   * @param {Response} res
   */
  static async getMe(req, res) {
    const { user } = req;

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
