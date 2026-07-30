const multer = require('multer');

function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('File harus berupa gambar'));
  cb(null, true);
}

const uploadMacbookPhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('photo');

const uploadUserPhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('photo');

module.exports = { uploadMacbookPhoto, uploadUserPhoto };
