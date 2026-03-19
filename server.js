import express from 'express';
import cors from 'cors';
import session from 'express-session';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// CORS configuration for production - FIXED
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://hr-file-frontend.onrender.com',
  'https://hr-file-backend.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Session configuration - FIXED FOR PRODUCTION
app.use(session({
  secret: process.env.SESSION_SECRET || 'hr-file-secret-key-dev-only',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // IMPORTANT: 'none' for cross-site
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  name: 'hrfile.sid',
  proxy: process.env.NODE_ENV === 'production' // trust proxy in production
}));

// Connect to SQLite database
const db = new sqlite3.Database(join(__dirname, 'hr_database.sqlite'));

// Create tables
db.serialize(() => {
  // Users table for admin
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Active Employees table
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
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
    )
  `);

  // RESIGNED Employees table
  db.run(`
    CREATE TABLE IF NOT EXISTS resigned_employees (
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
    )
  `);

  // Bank Accounts table
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // HARDWARE INVENTORY table
  db.run(`
    CREATE TABLE IF NOT EXISTS hardware_inventory (
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
    )
  `);

  // PHONE INVENTORY table
  db.run(`
    CREATE TABLE IF NOT EXISTS phone_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      cellphone_number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // CARS INVENTORY table
  db.run(`
    CREATE TABLE IF NOT EXISTS cars_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assigned_to TEXT NOT NULL,
      type_of_car TEXT NOT NULL,
      plate_number TEXT NOT NULL,
      autosweep_acct TEXT,
      card_no TEXT,
      easytrip_acct TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // BIRTHDAYS table
  db.run(`
    CREATE TABLE IF NOT EXISTS birthdays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      date_started TEXT NOT NULL,
      regularized TEXT,
      date_of_birth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default admin if not exists
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        ['admin', 'admin123']
      );
      console.log('✅ Default admin created: admin / admin123');
    }
  });

  // Insert sample active employees (only if table is empty)
  db.get("SELECT COUNT(*) as count FROM employees", (err, row) => {
    if (row && row.count === 0) {
      const sampleData = [
        ['Juan Dela Cruz', 'HR Manager', 'BS Psychology', '2020-01-15', '2020-07-15', 'Regular', 45000, '12-3456789-0', '12-345678901-2', '1234-5678-9012', '123-456-789-000', '09171234567', 'juan.delacruz@hrfile.com', '123 Rizal St, Manila', null],
        ['Maria Santos', 'Senior Developer', 'BS Computer Science', '2021-03-10', '2021-09-10', 'Regular', 55000, '12-3456789-1', '12-345678901-3', '1234-5678-9013', '123-456-789-001', '09172345678', 'maria.santos@hrfile.com', '456 Mabini St, QC', null],
        ['Pedro Reyes', 'Marketing Specialist', 'BS Business Admin', '2022-06-20', null, 'Probationary', 35000, '12-3456789-2', '12-345678901-4', '1234-5678-9014', '123-456-789-002', '09173456789', 'pedro.reyes@hrfile.com', '789 Luna St, Makati', null]
      ];

      const stmt = db.prepare(`
        INSERT INTO employees (
          name, position, diploma, date_started, date_regularized,
          employment_status, salary, sss, philhealth, pagibig, tin,
          cp_viber, official_email, home_address, resignation_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleData.forEach(emp => {
        stmt.run(emp);
      });
      stmt.finalize();
      console.log('✅ Sample active employees added');
    }
  });

  // Insert sample resigned employees
  db.get("SELECT COUNT(*) as count FROM resigned_employees", (err, row) => {
    if (row && row.count === 0) {
      const sampleResigned = [
        ['Anna Reyes', 'Admin Assistant', 'BSBA', '2019-05-10', '2019-11-10', 'Regular', 28000, '12-3456789-3', '12-345678901-5', '1234-5678-9015', '123-456-789-003', '09174567890', 'anna.reyes@hrfile.com', '456 P. Gomez St, Manila', '2023-12-15', 'Career growth'],
        ['Ben Torres', 'Sales Associate', 'BS Marketing', '2020-08-20', '2021-02-20', 'Regular', 32000, '12-3456789-4', '12-345678901-6', '1234-5678-9016', '123-456-789-004', '09175678901', 'ben.torres@hrfile.com', '789 Taft Ave, Pasay', '2024-01-30', 'Relocation']
      ];

      const stmt = db.prepare(`
        INSERT INTO resigned_employees (
          name, position, diploma, date_started, date_regularized,
          employment_status, salary, sss, philhealth, pagibig, tin,
          cp_viber, official_email, home_address, resignation_date, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleResigned.forEach(emp => {
        stmt.run(emp);
      });
      stmt.finalize();
      console.log('✅ Sample resigned employees added');
    }
  });

  // Insert sample hardware inventory
  db.get("SELECT COUNT(*) as count FROM hardware_inventory", (err, row) => {
    if (row && row.count === 0) {
      const sampleHardware = [
        ['Laptop', 'PH-PHASM04-LTP2', 'DELL', '7Y2T8Y2', 'Windows 10 Pro', 'English', 'Qwerty EN', '2019', 'TRUE', '', 'FALSE', 'At employee\'s possession', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'Leah EVANGELISTA']
      ];

      const stmt = db.prepare(`
        INSERT INTO hardware_inventory (
          hardware_type, windows_hostname, brand, serial_number,
          windows_version, windows_language, keyboard_type, year_of_purchase,
          clarilog_installed, comment, computer_at_office, location_at_office,
          never_at_office, home_office_plus, multiple_users, single_user, user_fullname
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleHardware.forEach(item => {
        stmt.run(item);
      });
      stmt.finalize();
      console.log('✅ Sample hardware inventory added');
    }
  });

  // Insert sample phone inventory
  db.get("SELECT COUNT(*) as count FROM phone_inventory", (err, row) => {
    if (row && row.count === 0) {
      const samplePhones = [
        ['Juan Dela Cruz', 'iPhone 13', 'SN123456', '09171234567'],
        ['Maria Santos', 'Samsung S23', 'SN789012', '09172345678']
      ];

      const stmt = db.prepare(`
        INSERT INTO phone_inventory (name, unit, serial_number, cellphone_number)
        VALUES (?, ?, ?, ?)
      `);

      samplePhones.forEach(phone => {
        stmt.run(phone);
      });
      stmt.finalize();
      console.log('✅ Sample phone inventory added');
    }
  });

  // Insert sample cars inventory
  db.get("SELECT COUNT(*) as count FROM cars_inventory", (err, row) => {
    if (row && row.count === 0) {
      const sampleCars = [
        ['Juan Dela Cruz', 'Toyota Vios', 'ABC1234', 'AS12345', 'CARD001', 'ET12345'],
        ['Maria Santos', 'Honda Civic', 'XYZ5678', 'AS67890', 'CARD002', 'ET67890']
      ];

      const stmt = db.prepare(`
        INSERT INTO cars_inventory (assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      sampleCars.forEach(car => {
        stmt.run(car);
      });
      stmt.finalize();
      console.log('✅ Sample cars inventory added');
    }
  });

  // Insert sample birthdays
  db.get("SELECT COUNT(*) as count FROM birthdays", (err, row) => {
    if (row && row.count === 0) {
      const sampleBirthdays = [
        ['Juan Dela Cruz', 'HR Manager', '2020-01-15', '2020-07-15', '1990-05-20'],
        ['Maria Santos', 'Senior Developer', '2021-03-10', '2021-09-10', '1992-08-15']
      ];

      const stmt = db.prepare(`
        INSERT INTO birthdays (name, position, date_started, regularized, date_of_birth)
        VALUES (?, ?, ?, ?, ?)
      `);

      sampleBirthdays.forEach(bday => {
        stmt.run(bday);
      });
      stmt.finalize();
      console.log('✅ Sample birthdays added');
    }
  });
});

// Check database tables
app.get('/api/check-tables', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(tables);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Use routes
app.use('/api/auth', authRoutes(db));
app.use('/api/employees', employeeRoutes(db));
app.use('/api/bank-accounts', bankAccountsRoutes(db));
app.use('/api/resigned-employees', resignedRoutes(db));
app.use('/api/hardware', hardwareRoutes(db));
app.use('/api/phones', phoneRoutes(db));
app.use('/api/cars', carsRoutes(db));
app.use('/api/birthdays', birthdaysRoutes(db));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Routes:`);
  console.log(`   - /api/auth`);
  console.log(`   - /api/employees`);
  console.log(`   - /api/resigned-employees`);
  console.log(`   - /api/bank-accounts`);
  console.log(`   - /api/hardware`);
  console.log(`   - /api/phones`);
  console.log(`   - /api/cars`);
  console.log(`   - /api/birthdays`);
  console.log(`   - /api/check-tables`);
  console.log(`   - /api/health`);
});