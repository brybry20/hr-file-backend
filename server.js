import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Import models
import User from './models/User.js';
import Employee from './models/Employee.js';
import ResignedEmployee from './models/ResignedEmployee.js';
import BankAccount from './models/BankAccount.js';
import Hardware from './models/Hardware.js';
import Phone from './models/Phone.js';
import Car from './models/Car.js';
import Birthday from './models/Birthday.js';
import EmployeeFile from './models/EmployeeFile.js';
import EmployeeFolder from './models/EmployeeFolder.js';

// Import routes
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import resignedRoutes from './routes/resigned.js';
import bankAccountsRoutes from './routes/bankAccounts.js';
import hardwareRoutes from './routes/hardware.js';
import phoneRoutes from './routes/phones.js';
import carsRoutes from './routes/cars.js';
import birthdaysRoutes from './routes/birthdays.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ========== MONGODB CONNECTION ==========
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    
    await mongoose.connect(uri, {
      dbName: 'hr_database'
    });
    console.log('🍃 MongoDB connected successfully');
    
    // Initialize admin after connection
    await initializeAdmin();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // In production, we might want to exit if DB connection fails
    if (process.env.NODE_ENV === 'production') {
      console.error('Critical failure: Could not connect to DB in production');
    }
  }
};

// ========== CLOUDINARY CONFIGURATION ==========
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    const isWord = file.mimetype === 'application/msword' || 
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isExcel = file.mimetype === 'application/vnd.ms-excel' || 
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    const originalName = file.originalname.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const safeFileName = `${originalName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
    
    if (isPdf) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'image',
        format: 'pdf',
        access_mode: 'public'
      };
    } else if (isImage) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'image',
        format: file.mimetype.split('/')[1],
        transformation: [{ width: 1000, crop: 'limit' }]
      };
    } else if (isWord || isExcel) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'raw',
        format: isWord ? 'docx' : 'xlsx',
        access_mode: 'public'
      };
    } else {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'raw'
      };
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`), false);
    }
  }
});

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://hr-file-frontend.onrender.com',
  'https://hr-file-backend.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// ========== SESSION CONFIGURATION ==========
app.use(session({
  secret: process.env.SESSION_SECRET || 'hr-file-secret-key-dev-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  name: 'hrfile.sid',
  proxy: process.env.NODE_ENV === 'production'
}));

// ========== AUTHENTICATION MIDDLEWARE ==========
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ========== CREATE DEFAULT ADMIN ==========
const initializeAdmin = async () => {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({ username: 'admin', password: 'admin123' });
    console.log('✅ Default admin created');
  }
};

// ========== FILE ROUTES (MongoDB Version) ==========

// Upload files
app.post('/api/employees/:employeeId/files', requireAuth, upload.array('files', 20), async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  const { folderId } = req.query;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    const results = { success: [], failed: [] };
    
    for (const file of req.files) {
      try {
        const newFile = await EmployeeFile.create({
          employee_id: employeeId,
          folder_id: folderId ? parseInt(folderId) : null,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
          cloudinary_url: file.path,
          public_id: file.filename
        });
        results.success.push({ id: newFile._id, file_name: file.originalname, cloudinary_url: file.path });
      } catch (err) {
        results.failed.push(file.originalname);
      }
    }
    
    if (results.failed.length === 0) {
      res.json({ success: true, message: `Uploaded ${results.success.length} files`, files: results.success });
    } else {
      res.status(207).json({ partial: true, message: `Uploaded ${results.success.length} files, failed: ${results.failed.length}`, success: results.success, failed: results.failed });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get files
app.get('/api/employees/:employeeId/files', requireAuth, async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  const { folderId } = req.query;
  
  try {
    let query = { employee_id: employeeId };
    
    if (folderId && folderId !== 'null') {
      query.folder_id = parseInt(folderId);
    } else if (!folderId || folderId === 'null') {
      query.folder_id = null;
    }
    
    const files = await EmployeeFile.find(query).sort({ uploaded_at: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
app.delete('/api/files/:fileId', requireAuth, async (req, res) => {
  try {
    const file = await EmployeeFile.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    let resourceType = file.file_type?.startsWith('image/') ? 'image' : 'raw';
    cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType }, async () => {
      await EmployeeFile.findByIdAndDelete(req.params.fileId);
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename file
app.put('/api/files/:fileId/rename', requireAuth, async (req, res) => {
  const { newName } = req.body;
  if (!newName?.trim()) {
    return res.status(400).json({ error: 'New name is required' });
  }
  
  try {
    const result = await EmployeeFile.findByIdAndUpdate(
      req.params.fileId,
      { file_name: newName.trim() },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Move file
app.put('/api/files/:fileId/move', requireAuth, async (req, res) => {
  const { folderId } = req.body;
  
  try {
    await EmployeeFile.findByIdAndUpdate(req.params.fileId, { folder_id: folderId || null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== FOLDER ROUTES (MongoDB Version) ==========

// Get folders
app.get('/api/employees/:employeeId/folders', requireAuth, async (req, res) => {
  try {
    const folders = await EmployeeFolder.find({ employee_id: parseInt(req.params.employeeId) }).sort({ created_at: -1 });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create folder
app.post('/api/employees/:employeeId/folders', requireAuth, async (req, res) => {
  const { name, parentFolderId } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  try {
    const folder = await EmployeeFolder.create({
      employee_id: parseInt(req.params.employeeId),
      folder_name: name.trim(),
      parent_folder_id: parentFolderId || null
    });
    res.json({ id: folder._id, folder_name: folder.folder_name, parent_folder_id: folder.parent_folder_id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename folder
app.put('/api/folders/:folderId', requireAuth, async (req, res) => {
  const { name } = req.body;
  try {
    await EmployeeFolder.findByIdAndUpdate(req.params.folderId, { folder_name: name.trim() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete folder
app.delete('/api/folders/:folderId', requireAuth, async (req, res) => {
  try {
    const folder = await EmployeeFolder.findById(req.params.folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const parentId = folder.parent_folder_id;
    
    // Update files in this folder to parent folder
    await EmployeeFile.updateMany(
      { folder_id: parseInt(req.params.folderId) },
      { folder_id: parentId }
    );
    
    await EmployeeFolder.findByIdAndDelete(req.params.folderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== ROUTES ==========
app.use('/api/auth', authRoutes(User));
app.use('/api/employees', employeeRoutes(Employee, ResignedEmployee));
app.use('/api/bank-accounts', bankAccountsRoutes(BankAccount));
app.use('/api/resigned-employees', resignedRoutes(ResignedEmployee));
app.use('/api/hardware', hardwareRoutes(Hardware));
app.use('/api/phones', phoneRoutes(Phone));
app.use('/api/cars', carsRoutes(Car));
app.use('/api/birthdays', birthdaysRoutes(Birthday));

// ========== START SERVER ==========
const start = async () => {
  await connectDB();
  
  // Error handling middleware (should be after routes)
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
  });
};

start();