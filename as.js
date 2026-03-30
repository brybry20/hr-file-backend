import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🔍 Listing files in Cloudinary...\n');

// List all resources in the employees folder
cloudinary.api.resources({
  type: 'upload',
  prefix: 'employees/',
  max_results: 50
}, (error, result) => {
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`📁 Found ${result.resources.length} files in employees folder:\n`);
    result.resources.forEach((resource, index) => {
      console.log(`${index + 1}. Public ID: ${resource.public_id}`);
      console.log(`   URL: ${resource.secure_url}`);
      console.log(`   Format: ${resource.format}`);
      console.log(`   Access Mode: ${resource.access_mode || 'N/A'}\n`);
    });
    
    if (result.resources.length === 0) {
      console.log('⚠️ No files found in employees folder');
      console.log('💡 Try uploading a new file first');
    }
  }
});