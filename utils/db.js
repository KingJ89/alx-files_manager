import { MongoClient } from 'mongodb';
import loadEnvironment from './env_loader';

/**
 * Represents a custom MongoDB client.
 */
class CustomDBClient {
  /**
   * Creates a new CustomDBClient instance.
   */
  constructor() {
    loadEnvironment();
    const dbHost = process.env.CUSTOM_DB_HOST || 'localhost';
    const dbPort = process.env.CUSTOM_DB_PORT || 27017;
    const dbName = process.env.CUSTOM_DB_NAME || 'custom_files_manager';
    const dbConnectionURL = `mongodb://${dbHost}:${dbPort}/${dbName}`;

    this.mongoClient = new MongoClient(dbConnectionURL, { useUnifiedTopology: true });
    this.databaseName = dbName;
    this.initializeConnection();
  }

  /**
   * Establishes a connection to the MongoDB server.
   */
  async initializeConnection() {
    try {
      await this.mongoClient.connect();
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Checks if the MongoDB server connection is active.
   * @returns {boolean}
   */
  isConnectionAlive() {
    return this.mongoClient?.topology?.isConnected() ?? false;
  }

  /**
   * Counts documents in a specified collection.
   * @param {string} collection - The name of the collection.
   * @returns {Promise<number>}
   */
  async countDocumentsInCollection(collection) {
    try {
      return await this.mongoClient.db(this.databaseName).collection(collection).countDocuments();
    } catch (error) {
      console.error(`Error counting documents in collection ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Counts the number of users in the database.
   * @returns {Promise<number>}
   */
  async getUserCount() {
    return this.countDocumentsInCollection('users');
  }

  /**
   * Counts the number of files in the database.
   * @returns {Promise<number>}
   */
  async getFileCount() {
    return this.countDocumentsInCollection('files');
  }

  /**
   * Retrieves a reference to a specified collection.
   * @param {string} collection - The name of the collection.
   * @returns {Promise<Collection>}
   */
  getCollectionReference(collection) {
    return this.mongoClient.db(this.databaseName).collection(collection);
  }

  /**
   * Retrieves a reference to the `users` collection.
   * @returns {Promise<Collection>}
   */
  async getUsersCollection() {
    return this.getCollectionReference('users');
  }

  /**
   * Retrieves a reference to the `files` collection.
   * @returns {Promise<Collection>}
   */
  async getFilesCollection() {
    return this.getCollectionReference('files');
  }
}

export const customDBClient = new CustomDBClient();
export default customDBClient;

