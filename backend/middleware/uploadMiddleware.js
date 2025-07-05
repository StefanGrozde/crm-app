const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create the directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'widgets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Ensure we don't overwrite existing widgets with the same name
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

module.exports = upload;