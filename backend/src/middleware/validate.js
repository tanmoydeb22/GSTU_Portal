/**
 * Joi validation middleware factory.
 * Usage: validate(schema) where schema is a Joi object.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }

    req.body = value;
    next();
  };
}

/**
 * Validate query parameters.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details,
      });
    }

    req.query = value;
    next();
  };
}

module.exports = { validate, validateQuery };
