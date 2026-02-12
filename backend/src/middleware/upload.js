const { upload } = require('../utils/cloudinary');

// Single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => 
  upload.array(fieldName, maxCount);

// Fields upload (for multiple fields)
const uploadFields = (fields) => upload.fields(fields);

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields
};