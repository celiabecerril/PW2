const cloudinary = require('cloudinary').v2;
const config = require('./src/config');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

module.exports = cloudinary;