/**
 * Custom API Error class.
 */
export class APIError extends Error {
  constructor(statusCode, errorMessage) {
    super(errorMessage);
    this.statusCode = statusCode || 500;
  }
}
