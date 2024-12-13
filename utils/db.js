import { MongoClient } from 'mongodb';
import envLoader from './env_loader';

/**
 * Represents a MongoDB client.
 */
class DBClient {
  /**
   * Creates a new DBClient instance.
   */
  constructor() {
    envLoader();
    const {
      DB_HOST = 'localhost',
      DB_PORT = 27017,
      DB_DATABASE = 'files_manager',
    } = process.env;
    
    const dbURL = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
    this.client = new MongoClient(dbURL, { useUnifiedTopology: true });
    this.client.connect();
  }

  /**
   * Check if the client's connection to the MongoDB server is active.
   * @returns {boolean}
   */
  isAlive() {
    return this.client.isConnected();
  }

  /**
   * Retrieves the number of users in the database.
   * @returns {Promise<Number>}
   */
  async nbUsers() {
    return this._countDocuments('users');
  }

  /**
   * Retrieves the number of files in the database.
   * @returns {Promise<Number>}
   */
  async nbFiles() {
    return this._countDocuments('files');
  }

  /**
   * Retrieves a reference to a collection.
   * @param {string} collectionName - The name of the collection.
   * @returns {Promise<Collection>}
   */
  async _getCollection(collectionName) {
    return this.client.db().collection(collectionName);
  }

  /**
   * Retrieves a reference to the `users` collection.
   * @returns {Promise<Collection>}
   */
  usersCollection() {
    return this._getCollection('users');
  }

  /**
   * Retrieves a reference to the `files` collection.
   * @returns {Promise<Collection>}
   */
  filesCollection() {
    return this._getCollection('files');
  }

  /**
   * Counts the documents in a specified collection.
   * @param {string} collectionName - The name of the collection.
   * @returns {Promise<Number>}
   */
  async _countDocuments(collectionName) {
    return (await this._getCollection(collectionName)).countDocuments();
  }
}

export const dbClient = new DBClient();
export default dbClient;
