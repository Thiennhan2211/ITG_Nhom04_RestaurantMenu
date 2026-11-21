const crypto = require('crypto');

const readEnv = (name) => String(process.env[name] || '').trim().replace(/^(['"])(.*)\1$/, '$2');

const parseCloudinaryUrl = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:' || !url.hostname || !url.username || !url.password) return null;
    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password)
    };
  } catch {
    return null;
  }
};

const getConfig = () => {
  const cloudinaryUrl = parseCloudinaryUrl(readEnv('CLOUDINARY_URL'));

  return {
    // Prefer CLOUDINARY_URL so the cloud name and its credentials always belong to the same account.
    cloudName: cloudinaryUrl?.cloudName || readEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: cloudinaryUrl?.apiKey || readEnv('CLOUDINARY_API_KEY'),
    apiSecret: cloudinaryUrl?.apiSecret || readEnv('CLOUDINARY_API_SECRET'),
    assetFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'QR-menu/products',
    allowedFormats: 'jpg,png,webp'
  };
};

const isConfigured = () => {
  const { cloudName, apiKey, apiSecret } = getConfig();
  return Boolean(cloudName && apiKey && apiSecret);
};

const createProductUploadSignature = (timestamp) => {
  const { cloudName, apiKey, apiSecret, assetFolder, allowedFormats } = getConfig();
  if (!isConfigured()) {
    throw new Error('Cloudinary chưa được cấu hình đầy đủ. Hãy đặt CLOUDINARY_URL hoặc CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trên Render.');
  }

  // Các tham số cần ký sắp xếp theo thứ tự alphabet:
  // allowed_formats -> asset_folder -> timestamp
  const paramsToSign = `allowed_formats=${allowedFormats}&asset_folder=${assetFolder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(`${paramsToSign}${apiSecret}`)
    .digest('hex');

  return { cloudName, apiKey, assetFolder, allowedFormats, timestamp, signature };
};

module.exports = { isConfigured, createProductUploadSignature };
