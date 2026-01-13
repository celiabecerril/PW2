
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/productos',
  jwtSecret: process.env.JWT_SECRET || 'pereda41_secret_key_2024_muy_segura',
  jwtExpiration: '24h'
};


module.exports.cloudinary = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || ''
};