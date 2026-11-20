const crypto = require('crypto');

const getConfig = () => ({
  cloudName: String(process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  apiKey: String(process.env.CLOUDINARY_API_KEY || '').trim(),
  apiSecret: String(process.env.CLOUDINARY_API_SECRET || '').trim(),
  assetFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'QR-menu/products',
  allowedFormats: 'jpg,png,webp'
});

const isConfigured = () => {
  const { cloudName, apiKey, apiSecret } = getConfig();
  return Boolean(cloudName && apiKey && apiSecret);
};

const createProductUploadSignature = (timestamp) => {
  const { cloudName, apiKey, apiSecret, assetFolder, allowedFormats } = getConfig();
  if (!isConfigured()) {
    throw new Error('Cloudinary chưa được cấu hình trên máy chủ.');
  }

  const paramsToSign = `allowed_formats=${allowedFormats}&asset_folder=${assetFolder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(`${paramsToSign}${apiSecret}`)
    .digest('hex');

  return { cloudName, apiKey, assetFolder, allowedFormats, timestamp, signature };
};

module.exports = { isConfigured, createProductUploadSignature };
