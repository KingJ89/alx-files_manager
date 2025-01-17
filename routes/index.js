import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';
import { basicAuthenticate, xTokenAuthenticate } from '../middlewares/auth';
import { APIError, errorResponse } from '../middlewares/error';

/**
 * Injects routes with their handlers to the given Express application.
 * @param {Express} api
 */
const injectRoutes = (api) => {
  // App routes
  api.get('/status', AppController.getStatus);
  api.get('/stats', AppController.getStats);

  // Authentication routes
  api.get('/connect', basicAuthenticate, AuthController.getConnect);
  api.get('/disconnect', xTokenAuthenticate, AuthController.getDisconnect);

  // User routes
  api.post('/users', UsersController.postNew);
  api.get('/users/me', xTokenAuthenticate, UsersController.getMe);

  // File routes
  api.post('/files', xTokenAuthenticate, FilesController.postUpload);
  api.get('/files/:id', xTokenAuthenticate, FilesController.getShow);
  api.get('/files', xTokenAuthenticate, FilesController.getIndex);
  api.put('/files/:id/publish', xTokenAuthenticate, FilesController.putPublish);
  api.put('/files/:id/unpublish', xTokenAuthenticate, FilesController.putUnpublish);
  api.get('/files/:id/data', FilesController.getFile);

  // Catch-all route for unmatched requests
  api.all('*', (req, res, next) => {
    errorResponse(new APIError(404, `Cannot ${req.method} ${req.url}`), req, res, next);
  });

  // Global error handling middleware
  api.use(errorResponse);
};

export default injectRoutes;

