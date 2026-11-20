
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const isConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const uploadProductImage = (buffer) => new Promise((resolve, reject) => {
  if (!isConfigured()) {
    reject(new Error('Cloudinary chưa được cấu hình trên máy chủ.'));
    return;
  }

  cloudinary.uploader.upload_stream({
    asset_folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'QR-menu/products',
    resource_type: 'image'
  }, (error, result) => {
    if (error) {
      reject(error);
      return;
    }
    if (!result?.secure_url) {
      reject(new Error('Cloudinary không trả về URL ảnh an toàn.'));
      return;
    }
    resolve({ url: result.secure_url, publicId: result.public_id });
  }).end(buffer);
});

module.exports = { isConfigured, uploadProductImage };
