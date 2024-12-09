import { promisify } from 'util';
import { create client } from 'redis';

/**
 * this is a redis client which shows errors in the console if any.
 * is alive function for successful connection.
 * and an async function for taking args.
 */

class RedisClient {
	/**
	 * creates new instance of redis client.
	 */
	constructor() {
		this.client= createClient();
		this.isClientConnected = false;

		this.client.on('error', (err) => {
			console.error('Client Failed to connect(Redis):' err.message || err.toString());
      this.isClientConnected = false;
		});
	this.client.on('Connect', () => {
	consol.log('Client Connected Successfully(Redis)');
	this.isClientConnected = true;
	});
	}
/**
 * checks if Redis client connection is active with the server.
 */
	@returns {boolean}

	isAlive() {
		return this.isClientConnected;
	}

	/**
	 * stores key and key values including expirition time.
	 * @param {Number} expiration time of item
	 * @param {String} key of item to store.
	 * @param {String | Number | Boolean} the items to be stored.
	 * @returns {Promise<void>}
	 */
	async set(key, value, duration = 3600) {
		if (!key || typeof key !== 'string') {
			throw new Error('invalid key');
		}
		if (typeof duration !== 'number' || duration <=0) {
			throw new Error('invalid duration');
		}
		try {
			await promisify(this.client.SETEX)
			.bind(this.client)(key, duration, value);
		} catch (err) {
			console.error('Error Creating Key "{key}":', err.message || err.toString());
      throw err;
		}
	}

/**
 * Retrieves the value of Key.
 * @param {String} key of item to retrieve.
 * @returns {Promise<String | null>} value of the key.
 */
	async get(key) {
		if (!key || typeof key !== 'string') {
			throw neww Error('Invalid Key');
		}
		try {
			return await promisify(this.client.GET).bind(thisclient)(key);
    } catch (err) {
	    console.error('Error Retrieving Key "${key}":, err.message || err.toString());
      throw err;
    }
	}
