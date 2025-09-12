const multer = require('multer');

// Use in-memory storage for file uploads (so we can send directly to Supabase)
const upload = multer({ storage: multer.memoryStorage() });

module.exports = upload;
