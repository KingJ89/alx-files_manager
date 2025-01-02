import { promisify } from 'util';
import { createClient } from 'redis';

/**
 * Represents a custom Redis handler.
 */
class CustomRedisHandler {
  /**
   * Initializes a new instance of the Redis handler.
   */
  constructor() {
    this.redisClient = createClient();
    this.connectionStatus = true;

    this.redisClient.on('error', (error) => {
      console.error('Redis connection error:', error.message || error.toString());
      this.connectionStatus = false;
    });

    this.redisClient.on('connect', () => {
      this.connectionStatus = true;
    });
  }

  /**
   * Verifies if the Redis connection is active.
   * @returns {boolean} True if the connection is alive, false otherwise.
   */
  isConnectionAlive() {
    return this.connectionStatus;
  }

  /**
   * Retrieves the value associated with a specific key.
   * @param {string} redisKey The key to look up.
   * @returns {Promise<string | null>} The value of the key, or null if not found.
   */
  async fetchValue(redisKey) {
    return promisify(this.redisClient.GET).bind(this.redisClient)(redisKey);
  }

  /**
   * Stores a key-value pair in Redis with an expiration duration.
   * @param {string} redisKey The key to store.
   * @param {string | number | boolean} redisValue The value to associate with the key.
   * @param {number} expireTime The expiration duration in seconds.
   * @returns {Promise<void>} Resolves when the operation is complete.
   */
  async storeValue(redisKey, redisValue, expireTime) {
    await promisify(this.redisClient.SETEX)
      .bind(this.redisClient)(redisKey, expireTime, redisValue);
  }

  /**
   * Deletes the value associated with a specific key.
   * @param {string} redisKey The key to delete.
   * @returns {Promise<void>} Resolves when the operation is complete.
   */
  async deleteValue(redisKey) {
    await promisify(this.redisClient.DEL).bind(this.redisClient)(redisKey);
  }
}

export const redisHandler = new CustomRedisHandler();
export default redisHandler;
