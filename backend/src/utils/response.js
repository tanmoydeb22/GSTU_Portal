/**
 * Standard API response helpers.
 */
function success(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

function created(res, data = null, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function error(res, message = 'Something went wrong', statusCode = 500, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

function badRequest(res, message = 'Bad request', details = null) {
  return error(res, message, 400, details);
}

module.exports = { success, created, error, notFound, forbidden, badRequest };
