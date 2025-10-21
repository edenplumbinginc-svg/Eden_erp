const { ZodError } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          issues: parsed.error.flatten()
        }
      });
    }
    
    req.data = parsed.data;
    next();
  };
};

module.exports = { validate };
