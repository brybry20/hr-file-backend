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
import bankAccountsRoutes from './routes/bankAccounts.js'; // Capital A
import hardwareRoutes from './routes/hardware.js';
import phoneRoutes from './routes/phones.js';   
import carsRoutes from './routes/cars.js';
import birthdaysRoutes from './routes/birthdays.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
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

// Connect to SQLite database
const db = new sqlite3.Database(join(__dirname, 'hr_database.sqlite'));

// ========== CREATE ALL TABLES FIRST ==========
db.serialize(() => {
  console.log('📦 Creating tables...');
  
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  // Employees table
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

  // Resigned employees table
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

  // Bank Accounts table - IMPORTANT: pangalan ng table ay bank_accounts (lowercase)
  db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('❌ Error creating bank_accounts table:', err.message);
    } else {
      console.log('✅ bank_accounts table created');
    }
  });

  // Hardware inventory table
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

  // Phone inventory table
  db.run(`CREATE TABLE IF NOT EXISTS phone_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    cellphone_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Cars inventory table
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

  // Birthdays table
  db.run(`CREATE TABLE IF NOT EXISTS birthdays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    date_started TEXT NOT NULL,
    regularized TEXT,
    date_of_birth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log('✅ All tables created');
});

// ========== INSERT DEFAULT DATA ==========
// Wait a bit for tables to be fully created
setTimeout(() => {
  // Insert default admin
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'admin123']);
      console.log('✅ Default admin created');
    }
  });

  // Insert sample employees
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

  // ====== AUTO-SEED BANK ACCOUNTS ======
  // Check if table exists and has data
  setTimeout(() => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bank_accounts'", (err, tableExists) => {
      if (err) {
        console.error('❌ Error checking bank_accounts table:', err.message);
      } else if (!tableExists) {
        console.error('❌ bank_accounts table does not exist!');
      } else {
        // Table exists, check if it has data
        db.get("SELECT COUNT(*) as count FROM bank_accounts", (err, row) => {
          if (err) {
            console.error('❌ Error checking bank_accounts count:', err.message);
          } else if (row.count === 0) {
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
            
            let inserted = 0;
            bankAccountsData.forEach((acc, index) => {
              stmt.run([acc[0], acc[1] || ''], function(err) {
                if (err) {
                  console.error(`❌ Error inserting ${acc[0]}:`, err.message);
                } else {
                  inserted++;
                  if (inserted === bankAccountsData.length) {
                    console.log(`✅ Bank accounts seeded (${inserted} records)`);
                  }
                }
              });
            });
            stmt.finalize();
          } else {
            console.log(`✅ Bank accounts already have ${row.count} records`);
          }
        });
      }
    });
  }, 1000); // Wait 1 second para siguradong nagawa na ang table
}, 500);
// ======================================

// Routes
app.get('/api/check-tables', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tables);
  });
});

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

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});