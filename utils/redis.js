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
	}
