// src/middleware/validate.js
function validate(schema, property = 'body') {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false, // show all errors
        stripUnknown: true, // remove unknown fields
      });
  
      if (error) {
        return res.status(400).json({
          message: 'Validation error',
          details: error.details.map(d => ({
            message: d.message,
            path: d.path,
          })),
        });
      }
  
      // Replace with validated/sanitized value
      req[property] = value;
      next();
    };
  }
  
  module.exports = validate;
  