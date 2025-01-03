import loadEnvironment from '../utils/env_loader';

/**
 * Starts the API server.
 * @param {Object} api - The Express application instance.
 */
const startServer = (api) => {
  // Load environment variables
  loadEnvironment();

  // Determine port and environment
  const port = parseInt(process.env.PORT, 10) || 5000;
  const environment = process.env.npm_lifecycle_event || 'development';

  // Start listening on the specified port
  api.listen(port, () => {
    console.log(`[${environment}] API is running on port ${port}`);
  });
};

export default startServer;

