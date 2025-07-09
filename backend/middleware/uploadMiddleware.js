const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create the uploaded widgets directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'widgets', 'uploaded');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Also ensure the builtin directory exists
const builtinDir = path.join(__dirname, '..', 'widgets', 'builtin');
if (!fs.existsSync(builtinDir)) {
  fs.mkdirSync(builtinDir, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Now saves to widgets/uploaded
  },
  filename: (req, file, cb) => {
    // Generate a unique filename if file already exists
    const originalName = file.originalname;
    const filePath = path.join(uploadDir, originalName);
    
    if (fs.existsSync(filePath)) {
      // If file exists, add timestamp to make it unique
      const timestamp = Date.now();
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const uniqueName = `${baseName}_${timestamp}${extension}`;
      cb(null, uniqueName);
    } else {
      cb(null, originalName);
    }
  },
});

// File filter to only allow JavaScript files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/javascript' || 
      file.mimetype === 'text/javascript' || 
      file.originalname.endsWith('.js')) {
    cb(null, true);
  } else {
    cb(new Error('Only JavaScript files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

module.exports = upload;