import express from 'express';

/**
 * Injects global middlewares into the Express application.
 * @param {express.Express} app - The Express application instance.
 */
const injectMiddlewares = (app) => {
  // Middleware to parse JSON payloads with a size limit of 200MB
  app.use(express.json({ limit: '200mb' }));

  // Additional middlewares can be added here in the future
};

export default injectMiddlewares;

