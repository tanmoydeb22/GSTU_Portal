const winston = require('winston');

// Winston logger for error details
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Global error handler middleware.
 * Must be registered AFTER all routes.
 */
function errorHandler(err, req, res, _next) {
  // Log full error server-side
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    user: req.user?.userId || 'anonymous',
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: isProduction && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error',
    ...((!isProduction && err.stack) && { stack: err.stack }),
  });
}

module.exports = { errorHandler, logger };
