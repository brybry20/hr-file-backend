import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import EmployeeFile from './models/EmployeeFile.js';
import EmployeeFolder from './models/EmployeeFolder.js';

async function deleteAllFiles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get counts before deletion
    const fileCount = await EmployeeFile.countDocuments();
    const folderCount = await EmployeeFolder.countDocuments();
    
    console.log(`📊 Found: ${fileCount} files, ${folderCount} folders`);
    
    // Confirm
    console.log('\n⚠️ WARNING: This will delete ALL employee files and folders!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete all
    const fileResult = await EmployeeFile.deleteMany({});
    const folderResult = await EmployeeFolder.deleteMany({});
    
    console.log(`\n✅ Deleted ${fileResult.deletedCount} files`);
    console.log(`✅ Deleted ${folderResult.deletedCount} folders`);
    console.log('🎉 All employee files have been deleted!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

deleteAllFiles();