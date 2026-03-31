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
import fs from 'fs';

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

// ========== DATABASE PATH - USE PERSISTENT STORAGE ON RENDER ==========
let dbPath;
if (process.env.NODE_ENV === 'production' && process.env.RENDER) {
  const dataDir = '/data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = join(dataDir, 'hr_database.sqlite');
  console.log(`📁 Using persistent database at: ${dbPath}`);
} else {
  dbPath = join(__dirname, 'hr_database.sqlite');
  console.log(`📁 Using local database at: ${dbPath}`);
}

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
    const originalName = file.originalname.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const safeFileName = `${originalName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
    
    if (isImage) {
      return {
        folder: `employees/${req.params.employeeId}`,
        public_id: safeFileName,
        resource_type: 'image',
        transformation: [{ width: 1000, crop: 'limit' }]
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
const db = new sqlite3.Database(dbPath);

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

  // Files table
  db.run(`CREATE TABLE IF NOT EXISTS employee_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    folder_id INTEGER DEFAULT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    cloudinary_url TEXT NOT NULL,
    public_id TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating employee_files:', err);
    else console.log('✅ employee_files table created');
  });

  // Folders table
  db.run(`CREATE TABLE IF NOT EXISTS employee_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    folder_name TEXT NOT NULL,
    parent_folder_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) console.error('Error creating employee_folders:', err);
    else console.log('✅ employee_folders table created');
  });

  console.log('✅ All tables created');
});

// ========== FIX: ADD MISSING COLUMNS ==========
setTimeout(() => {
  // Add folder_id to employee_files if missing
  db.run("ALTER TABLE employee_files ADD COLUMN folder_id INTEGER DEFAULT NULL", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Note: folder_id column may already exist');
    } else if (!err) {
      console.log('✅ Added folder_id column to employee_files');
    }
  });
  
  // Add parent_folder_id to employee_folders if missing
  db.run("ALTER TABLE employee_folders ADD COLUMN parent_folder_id INTEGER DEFAULT NULL", (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Note: parent_folder_id column may already exist');
    } else if (!err) {
      console.log('✅ Added parent_folder_id column to employee_folders');
    }
  });
}, 1000);

// ========== INSERT DEFAULT DATA ==========
setTimeout(() => {
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'admin123']);
      console.log('✅ Default admin created');
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

  // Seed bank accounts if empty
  db.get("SELECT COUNT(*) as count FROM bank_accounts", (err, row) => {
    if (row && row.count === 0) {
      console.log('🌱 Seeding bank accounts...');
      const bankAccountsData = [
        ['Abilar, Nickah Joy Bulasa', '1225-0200-6590'],
        ['Asistio, Christine Haley Santos', '1225-0205-0050'],
        ['Atam, Sarze Bansil', '325-002-9320'],
        ['Aydalla, Karla', '1225-0205-2746'],
        ['Balagat, Mac James Guevarra', '1225-0203-7818'],
        ['Ballena, Geraldo Alvis', '325-020-3816'],
        ['Ballena, Junicio Alvis', '1225-0202-6982'],
        ['Borromeo, Felicisimo Minas', ''],
        ['Canatoy, Michael John Espares', '1225-0200-9832'],
        ['Carretas, Israel Lex Catanghal', '1225-0201-5458'],
        ['Ceniza, Evangeline Gonzalvo', '1225-0205-2738'],
        ['Del Rosario, Michael Nepomuceno', '1225-0200-3729'],
        ['Diocena, Arvin Jay Santos', '1225-0205-7047'],
        ['Echague, Francis Angelo Panganiban', '1225-0203-7798'],
        ['Evangelista, Maria Eleanor Becina', '1284-0201-4527'],
        ['Figueroa, Mariella Izon', ''],
        ['Garcia, Rey Neo', '1225-0202-9205'],
        ['Gatchalian, Jefferson Rivera', '1225-0204-0659'],
        ['Geres, Mariel Jimenez', '1225-0202-6990'],
        ['Genova, Ramel Bermio', '1225-0200-9816'],
        ['Hilario, Reynold Cadavis', '1225-0202-7040'],
        ['Interino, Nicky Boy Trio', '1225-0202-7067'],
        ['Labado, Ronel Ogcila', '1225-0202-7806'],
        ['Lagas, Arlene Namoco', '325-017-5915'],
        ['Leano, Mark Ading Mendiola', '1225-0203-9162'],
        ['Lozada, Ryan Posanso', '1225-0204-8587'],
        ['Magallanes, Francis', '1225-0203-7305'],
        ['Marcos, Gladys Joy Remegio', '1225-0202-7032'],
        ['Masilungan, Harold Reyes', '325-020-7113'],
        ['Navida, Donald Eslao', '1225-0205-3122'],
        ['Reyes, Robin Garbacio', '1225-0202-7024'],
        ['Rios, Lordielle Reyes', '1225-0205-7179'],
        ['Tatel, Alexander Teope', '1225-0200-5543'],
        ['Temones, Kennett Bozar', '1225-0202-7814'],
        ['Vargas, Mario Pagcaliwanagan', '']
      ];
      
      const stmt = db.prepare('INSERT INTO bank_accounts (name, account_number) VALUES (?, ?)');
      bankAccountsData.forEach(acc => {
        stmt.run([acc[0], acc[1] || '']);
      });
      stmt.finalize();
      console.log(`✅ ${bankAccountsData.length} bank accounts seeded`);
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
  const { folderId } = req.query;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  console.log(`📤 Uploading ${req.files.length} files for employee ${employeeId}`);
  
  const results = {
    success: [],
    failed: []
  };
  
  const stmt = db.prepare(
    `INSERT INTO employee_files (employee_id, folder_id, file_name, file_type, file_size, cloudinary_url, public_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  let completed = 0;
  
  req.files.forEach((file, idx) => {
    stmt.run([
      employeeId,
      folderId || null,
      file.originalname,
      file.mimetype,
      file.size,
      file.path,
      file.filename
    ], function(err) {
      if (err) {
        console.error(`❌ DB insert error for ${file.originalname}:`, err.message);
        results.failed.push(file.originalname);
      } else {
        results.success.push({
          id: this.lastID,
          file_name: file.originalname,
          cloudinary_url: file.path
        });
        console.log(`✅ Saved to DB: ${file.originalname} (ID: ${this.lastID})`);
      }
      completed++;
      
      if (completed === req.files.length) {
        stmt.finalize();
        if (results.failed.length === 0) {
          res.json({ 
            success: true, 
            message: `Uploaded ${results.success.length} files`,
            files: results.success 
          });
        } else {
          res.status(207).json({ 
            partial: true,
            message: `Uploaded ${results.success.length} files, failed: ${results.failed.length}`,
            success: results.success,
            failed: results.failed
          });
        }
      }
    });
  });
});

// Get files for an employee (with optional folder filter)
app.get('/api/employees/:employeeId/files', requireAuth, (req, res) => {
  const employeeId = req.params.employeeId;
  const { folderId } = req.query;
  
  let query = 'SELECT * FROM employee_files WHERE employee_id = ?';
  const params = [employeeId];
  
  if (folderId && folderId !== 'null' && folderId !== 'undefined') {
    query += ' AND folder_id = ?';
    params.push(folderId);
  } else if (!folderId || folderId === 'null') {
    query += ' AND (folder_id IS NULL OR folder_id = 0)';
  }
  
  query += ' ORDER BY uploaded_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching files:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
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
      res.json({ success: true, message: 'File renamed' });
    }
  );
});

// Move file to folder
app.put('/api/files/:fileId/move', requireAuth, (req, res) => {
  const fileId = req.params.fileId;
  const { folderId } = req.body;
  
  db.run(
    'UPDATE employee_files SET folder_id = ? WHERE id = ?',
    [folderId || null, fileId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'File not found' });
      res.json({ success: true });
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
      res.json(rows);
    }
  );
});

// Create a new folder
app.post('/api/employees/:employeeId/folders', requireAuth, (req, res) => {
  const employeeId = req.params.employeeId;
  const { name, parentFolderId } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  db.run(
    'INSERT INTO employee_folders (employee_id, folder_name, parent_folder_id) VALUES (?, ?, ?)',
    [employeeId, name.trim(), parentFolderId || null],
    function(err) {
      if (err) {
        console.error('Error creating folder:', err);
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        id: this.lastID,
        employee_id: employeeId,
        folder_name: name.trim(),
        parent_folder_id: parentFolderId || null,
        success: true
      });
    }
  );
});

// Rename folder
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
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Folder not found' });
      res.json({ success: true });
    }
  );
});

// Delete folder
app.delete('/api/folders/:folderId', requireAuth, (req, res) => {
  const folderId = req.params.folderId;
  
  // Get parent folder ID first
  db.get('SELECT parent_folder_id FROM employee_folders WHERE id = ?', [folderId], (err, folder) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const parentId = folder?.parent_folder_id || null;
    
    // Move all files in this folder to parent folder
    db.run('UPDATE employee_files SET folder_id = ? WHERE folder_id = ?', [parentId, folderId], (err) => {
      if (err) console.error('Error moving files:', err);
      
      // Delete the folder
      db.run('DELETE FROM employee_folders WHERE id = ?', [folderId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Delete subfolders recursively
        const deleteSubfolders = (parentId) => {
          db.all('SELECT id FROM employee_folders WHERE parent_folder_id = ?', [parentId], (err, subs) => {
            if (err) return;
            subs.forEach(sub => {
              deleteSubfolders(sub.id);
              db.run('DELETE FROM employee_folders WHERE id = ?', [sub.id]);
            });
          });
        };
        deleteSubfolders(folderId);
        
        res.json({ success: true });
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
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📁 Database path: ${dbPath}`);
});