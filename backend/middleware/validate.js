// middleware/validate.js
module.exports = (schema) => (req, res, next) => {
  console.log("⚠️ Validate middleware triggered");
  console.log("📦 Incoming Body:", req.body);

  const result = schema.safeParse(req.body);

  if (!result.success) {
    console.log("❌ Validation failed:", result.error.errors);
    return res.status(400).json({
      message: 'Validation error',
      errors: result.error.errors
    });
  }

  req.validatedData = result.data;
  console.log("✅ Validation passed. Clean data:", req.validatedData);
  
  next();
};
