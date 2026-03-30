import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

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

// ========== CLOUDINARY CONFIGURATION ==========
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage with Cloudinary - FIXED FOR ALL FILE TYPES
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    const isWord = file.mimetype === 'application/msword' || 
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isExcel = file.mimetype === 'application/vnd.ms-excel' || 
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    // Clean filename - remove special characters
    const originalName = file.originalname.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const safeFileName = `${originalName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
    
    // Determine resource type and format
    if (isImage) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'image',
        format: file.mimetype.split('/')[1],
        transformation: [{ width: 1000, crop: 'limit' }]
      };
    } else if (isPdf) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'raw',
        format: 'pdf'
      };
    } else if (isWord) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'raw',
        format: 'docx'
      };
    } else if (isExcel) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'raw',
        format: 'xlsx'
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

// CORS configuration
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

// Session configuration
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

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Connect to SQLite database
const db = new sqlite3.Database(join(__dirname, 'hr_database.sqlite'));

// ========== CREATE ALL TABLES ==========
db.serialize(() => {
  console.log('📦 Creating tables...');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT,
    diploma TEXT,
    date_started TEXT,
    date_regularized TEXT,
    employment_status TEXT,
    salary REAL,
    sss TEXT,
    philhealth TEXT,
    pagibig TEXT,
    tin TEXT,
    cp_viber TEXT,
    official_email TEXT,
    home_address TEXT,
    resignation_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS resigned_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id INTEGER,
    name TEXT NOT NULL,
    position TEXT,
    diploma TEXT,
    date_started TEXT,
    date_regularized TEXT,
    employment_status TEXT,
    salary REAL,
    sss TEXT,
    philhealth TEXT,
    pagibig TEXT,
    tin TEXT,
    cp_viber TEXT,
    official_email TEXT,
    home_address TEXT,
    resignation_date TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS hardware_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hardware_type TEXT,
    windows_hostname TEXT,
    brand TEXT,
    serial_number TEXT,
    windows_version TEXT,
    windows_language TEXT,
    keyboard_type TEXT,
    year_of_purchase TEXT,
    clarilog_installed TEXT DEFAULT 'FALSE',
    comment TEXT,
    computer_at_office TEXT DEFAULT 'FALSE',
    location_at_office TEXT,
    never_at_office TEXT DEFAULT 'FALSE',
    home_office_plus TEXT DEFAULT 'FALSE',
    multiple_users TEXT DEFAULT 'FALSE',
    single_user TEXT DEFAULT 'FALSE',
    user_fullname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS phone_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    cellphone_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cars_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assigned_to TEXT NOT NULL,
    type_of_car TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    autosweep_acct TEXT,
    card_no TEXT,
    easytrip_acct TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    date_started TEXT NOT NULL,
    regularized TEXT,
    date_of_birth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS employee_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    cloudinary_url TEXT NOT NULL,
    public_id TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Folders table for persistent folder storage
  db.run(`CREATE TABLE IF NOT EXISTS employee_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    folder_name TEXT NOT NULL,
    parent_id INTEGER,
    file_ids TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) console.error('❌ Error creating employee_folders:', err.message);
    else console.log('✅ employee_folders table created');
  });

  console.log('✅ All tables created');
});

// ========== INSERT DEFAULT DATA ==========
setTimeout(() => {
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'admin123']);
      console.log('✅ Default admin created - Username: admin, Password: admin123');
    }
  });

  db.get("SELECT COUNT(*) as count FROM employees", (err, row) => {
    if (row && row.count === 0) {
      const sampleData = [
        ['Juan Dela Cruz', 'HR Manager', 'BS Psychology', '2020-01-15', '2020-07-15', 'Regular', 45000, '12-3456789-0', '12-345678901-2', '1234-5678-9012', '123-456-789-000', '09171234567', 'juan.delacruz@hrfile.com', '123 Rizal St, Manila', null],
        ['Maria Santos', 'Senior Developer', 'BS Computer Science', '2021-03-10', '2021-09-10', 'Regular', 55000, '12-3456789-1', '12-345678901-3', '1234-5678-9013', '123-456-789-001', '09172345678', 'maria.santos@hrfile.com', '456 Mabini St, QC', null],
        ['Pedro Reyes', 'Marketing Specialist', 'BS Business Admin', '2022-06-20', null, 'Probationary', 35000, '12-3456789-2', '12-345678901-4', '1234-5678-9014', '123-456-789-002', '09173456789', 'pedro.reyes@hrfile.com', '789 Luna St, Makati', null]
      ];

      const stmt = db.prepare(`INSERT INTO employees (
        name, position, diploma, date_started, date_regularized,
        employment_status, salary, sss, philhealth, pagibig, tin,
        cp_viber, official_email, home_address, resignation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      sampleData.forEach(emp => stmt.run(emp));
      stmt.finalize();
      console.log('✅ Sample employees added');
    }
  });
}, 500);

// ========== AUTH ROUTES ==========
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({ success: true, user: { id: user.id, username: user.username } });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, userId: req.session.userId, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// ========== FILE UPLOAD ROUTES ==========

// Upload multiple files for an employee
app.post('/api/employees/:employeeId/files', requireAuth, upload.array('files', 20), (req, res) => {
  const employeeId = req.params.employeeId;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  console.log(`📤 Uploading ${req.files.length} files for employee ${employeeId}`);
  
  const files = req.files.map(file => ({
    employee_id: employeeId,
    file_name: file.originalname,
    file_type: file.mimetype,
    file_size: file.size,
    cloudinary_url: file.path,
    public_id: file.filename
  }));

  const stmt = db.prepare(
    `INSERT INTO employee_files (employee_id, file_name, file_type, file_size, cloudinary_url, public_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  let inserted = 0;
  const insertedFiles = [];
  
  files.forEach((file, idx) => {
    stmt.run([file.employee_id, file.file_name, file.file_type, file.file_size, file.cloudinary_url, file.public_id], function(err) {
      if (err) {
        console.error(`❌ DB insert error for ${file.file_name}:`, err.message);
      } else {
        inserted++;
        insertedFiles.push({
          id: this.lastID,
          ...file
        });
        console.log(`✅ Saved to DB: ${file.file_name} (ID: ${this.lastID})`);
      }
      if (idx === files.length - 1) {
        stmt.finalize();
        if (insertedFiles.length > 0) {
          res.json({ success: true, message: `Uploaded ${insertedFiles.length} files`, files: insertedFiles });
        } else {
          res.status(500).json({ error: 'Failed to save files to database' });
        }
      }
    });
  });
});

// Get all files for an employee
app.get('/api/employees/:employeeId/files', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM employee_files WHERE employee_id = ? ORDER BY uploaded_at DESC',
    [req.params.employeeId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get files for current folder view
app.get('/api/employees/:employeeId/folder-files', requireAuth, (req, res) => {
  const employeeId = req.params.employeeId;
  const { folderId } = req.query;
  
  if (folderId && folderId !== 'null' && folderId !== 'undefined') {
    // Get files in specific folder
    db.get('SELECT file_ids FROM employee_folders WHERE id = ? AND employee_id = ?', [folderId, employeeId], (err, folder) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!folder) return res.json([]);
      
      const fileIds = JSON.parse(folder.file_ids || '[]');
      if (fileIds.length === 0) {
        return res.json([]);
      }
      
      const placeholders = fileIds.map(() => '?').join(',');
      db.all(`SELECT * FROM employee_files WHERE id IN (${placeholders}) ORDER BY uploaded_at DESC`, fileIds, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(files);
      });
    });
  } else {
    // Get files not in any folder (root files)
    db.all('SELECT * FROM employee_files WHERE employee_id = ? ORDER BY uploaded_at DESC', [employeeId], (err, allFiles) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get all file IDs that are in folders
      db.all('SELECT file_ids FROM employee_folders WHERE employee_id = ?', [employeeId], (err, folders) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const filesInFolders = new Set();
        folders.forEach(folder => {
          const ids = JSON.parse(folder.file_ids || '[]');
          ids.forEach(id => filesInFolders.add(id));
        });
        
        // Filter out files that are in any folder
        const rootFiles = allFiles.filter(file => !filesInFolders.has(file.id));
        res.json(rootFiles);
      });
    });
  }
});

// Delete a file
app.delete('/api/files/:fileId', requireAuth, (req, res) => {
  const fileId = req.params.fileId;

  db.get('SELECT public_id, file_type FROM employee_files WHERE id = ?', [fileId], (err, file) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!file) return res.status(404).json({ error: 'File not found' });

    let resourceType = 'raw';
    if (file.file_type?.startsWith('image/')) {
      resourceType = 'image';
    }
    
    // Also remove from any folders
    db.all('SELECT id, file_ids FROM employee_folders', [], (err, folders) => {
      if (!err && folders) {
        folders.forEach(folder => {
          let fileIds = JSON.parse(folder.file_ids || '[]');
          if (fileIds.includes(parseInt(fileId))) {
            fileIds = fileIds.filter(id => id !== parseInt(fileId));
            db.run('UPDATE employee_folders SET file_ids = ? WHERE id = ?', [JSON.stringify(fileIds), folder.id]);
          }
        });
      }
    });
    
    cloudinary.uploader.destroy(file.public_id, { resource_type: resourceType }, (cloudErr) => {
      if (cloudErr) console.error('Cloudinary delete error:', cloudErr);
      db.run('DELETE FROM employee_files WHERE id = ?', [fileId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'File deleted' });
      });
    });
  });
});

// Rename file
app.put('/api/files/:fileId/rename', requireAuth, (req, res) => {
  const fileId = req.params.fileId;
  const { newName } = req.body;
  
  if (!newName || !newName.trim()) {
    return res.status(400).json({ error: 'New name is required' });
  }
  
  db.run(
    'UPDATE employee_files SET file_name = ? WHERE id = ?',
    [newName.trim(), fileId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'File not found' });
      res.json({ success: true, message: 'File renamed successfully', newName: newName.trim() });
    }
  );
});

// Get file count per employee
app.get('/api/employees/:employeeId/files-count', requireAuth, (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM employee_files WHERE employee_id = ?',
    [req.params.employeeId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ count: row?.count || 0 });
    }
  );
});

// ========== FOLDER ROUTES ==========

// Get all folders for an employee
app.get('/api/employees/:employeeId/folders', requireAuth, (req, res) => {
  const employeeId = req.params.employeeId;
  
  db.all(
    'SELECT * FROM employee_folders WHERE employee_id = ? ORDER BY created_at DESC',
    [employeeId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching folders:', err);
        return res.status(500).json({ error: err.message });
      }
      
      const folders = rows.map(row => ({
        id: row.id,
        name: row.folder_name,
        parentId: row.parent_id,
        fileIds: JSON.parse(row.file_ids || '[]'),
        createdAt: row.created_at
      }));
      
      res.json(folders);
    }
  );
});

// Create a new folder
app.post('/api/employees/:employeeId/folders', requireAuth, (req, res) => {
  const employeeId = req.params.employeeId;
  const { name, parentId } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  db.run(
    'INSERT INTO employee_folders (employee_id, folder_name, parent_id, file_ids) VALUES (?, ?, ?, ?)',
    [employeeId, name.trim(), parentId || null, '[]'],
    function(err) {
      if (err) {
        console.error('Error creating folder:', err);
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        id: this.lastID,
        name: name.trim(),
        parentId: parentId || null,
        fileIds: [],
        success: true,
        message: 'Folder created successfully'
      });
    }
  );
});

// Update folder (rename)
app.put('/api/folders/:folderId', requireAuth, (req, res) => {
  const folderId = req.params.folderId;
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  db.run(
    'UPDATE employee_folders SET folder_name = ? WHERE id = ?',
    [name.trim(), folderId],
    function(err) {
      if (err) {
        console.error('Error renaming folder:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      
      res.json({ success: true, message: 'Folder renamed successfully' });
    }
  );
});

// Delete folder (recursive)
app.delete('/api/folders/:folderId', requireAuth, (req, res) => {
  const folderId = req.params.folderId;
  
  // Recursive function to get all subfolder IDs
  const getAllSubfolderIds = (parentId, callback) => {
    db.all('SELECT id FROM employee_folders WHERE parent_id = ?', [parentId], (err, rows) => {
      if (err) return callback(err, []);
      
      const subIds = rows.map(r => r.id);
      let processed = 0;
      let allIds = [...subIds];
      
      if (subIds.length === 0) {
        return callback(null, allIds);
      }
      
      subIds.forEach(subId => {
        getAllSubfolderIds(subId, (err, deeperIds) => {
          if (!err && deeperIds) allIds.push(...deeperIds);
          processed++;
          if (processed === subIds.length) {
            callback(null, allIds);
          }
        });
      });
    });
  };
  
  getAllSubfolderIds(folderId, (err, subIds) => {
    if (err) {
      console.error('Error getting subfolders:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const allIds = [parseInt(folderId), ...subIds];
    const placeholders = allIds.map(() => '?').join(',');
    
    db.run(`DELETE FROM employee_folders WHERE id IN (${placeholders})`, allIds, function(err) {
      if (err) {
        console.error('Error deleting folders:', err);
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ success: true, message: `Deleted ${this.changes} folder(s)` });
    });
  });
});

// Move file to folder (or remove from folder)
app.post('/api/folders/:folderId/move-file', requireAuth, (req, res) => {
  const folderId = req.params.folderId;
  const { fileId } = req.body;
  
  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required' });
  }
  
  const fileIdNum = parseInt(fileId);
  
  // First, remove file from ALL folders
  db.all('SELECT id, file_ids FROM employee_folders', [], (err, folders) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let updates = 0;
    let totalUpdates = folders.length;
    
    // If no folders exist
    if (totalUpdates === 0) {
      if (folderId !== 'root') {
        // Add to target folder
        db.get('SELECT file_ids FROM employee_folders WHERE id = ?', [folderId], (err, folder) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!folder) return res.status(404).json({ error: 'Folder not found' });
          
          let fileIds = JSON.parse(folder.file_ids || '[]');
          if (!fileIds.includes(fileIdNum)) {
            fileIds.push(fileIdNum);
            db.run('UPDATE employee_folders SET file_ids = ? WHERE id = ?', [JSON.stringify(fileIds), folderId], (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true, message: 'File moved to folder' });
            });
          } else {
            res.json({ success: true, message: 'File already in folder' });
          }
        });
      } else {
        res.json({ success: true, message: 'File moved to root' });
      }
      return;
    }
    
    // Remove from all folders
    folders.forEach(folder => {
      let fileIds = JSON.parse(folder.file_ids || '[]');
      const hadFile = fileIds.includes(fileIdNum);
      fileIds = fileIds.filter(id => id !== fileIdNum);
      
      db.run('UPDATE employee_folders SET file_ids = ? WHERE id = ?', [JSON.stringify(fileIds), folder.id], (err) => {
        if (err) console.error('Error updating folder:', err);
        updates++;
        
        if (updates === totalUpdates) {
          // After removing from all folders, add to target folder if specified
          if (folderId !== 'root') {
            db.get('SELECT file_ids FROM employee_folders WHERE id = ?', [folderId], (err, targetFolder) => {
              if (err) return res.status(500).json({ error: err.message });
              if (!targetFolder) return res.status(404).json({ error: 'Target folder not found' });
              
              let targetFileIds = JSON.parse(targetFolder.file_ids || '[]');
              if (!targetFileIds.includes(fileIdNum)) {
                targetFileIds.push(fileIdNum);
                db.run('UPDATE employee_folders SET file_ids = ? WHERE id = ?', [JSON.stringify(targetFileIds), folderId], (err) => {
                  if (err) return res.status(500).json({ error: err.message });
                  res.json({ success: true, message: 'File moved to folder' });
                });
              } else {
                res.json({ success: true, message: 'File already in folder' });
              }
            });
          } else {
            res.json({ success: true, message: 'File moved to root' });
          }
        }
      });
    });
  });
});

// ========== ROUTES ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes(db));
app.use('/api/employees', employeeRoutes(db));
app.use('/api/bank-accounts', bankAccountsRoutes(db));
app.use('/api/resigned-employees', resignedRoutes(db));
app.use('/api/hardware', hardwareRoutes(db));
app.use('/api/phones', phoneRoutes(db));
app.use('/api/cars', carsRoutes(db));
app.use('/api/birthdays', birthdaysRoutes(db));

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 File upload routes: /api/employees/:id/files`);
  console.log(`📂 Folder routes: /api/employees/:id/folders`);
  console.log(`📄 Supported files: Images, PDF, Word, Excel`);
});