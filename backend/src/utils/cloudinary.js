const multer = require("multer"); // <--- THIS IS THE MISSING PIECE
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    const fileType = file.mimetype.split('/')[0];
    let folder = 'tenderflow/documents';

    if (fileType === 'image') {
      folder = 'tenderflow/images';
    } else if (fileType === 'video') {
      folder = 'tenderflow/videos';
    }

    const params = {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
      public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
      // 1. FORCE 'raw' for PDFs to prevent image conversion
      resource_type: isPDF ? 'raw' : 'auto', 
    };

    // 2. ONLY apply transformations to images
    // Applying 'fetch_format: auto' to a PDF is what's turning it into a PNG!
    if (fileType === 'image') {
      params.transformation = [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    }

    return params;
  }
});

// File filter for Multer
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, and image files are allowed.'), false);
  }
};

// Configure Multer with Cloudinary storage
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Function to delete a file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'auto'
    });
    return true;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return false;
  }
};

module.exports = {
  cloudinary,
  upload,
  deleteFile
};