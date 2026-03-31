import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // REMOVE THE DROP TABLE! Just check if table exists and create if not
  // Only create table if it doesn't exist - DON'T DROP!
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating bank_accounts table:', err);
    } else {
      console.log('✅ Bank accounts table ready');
    }
  });

  // Insert default data if table is empty
  setTimeout(() => {
    db.get("SELECT COUNT(*) as count FROM bank_accounts", (err, row) => {
      if (err) {
        console.error('Error checking bank_accounts count:', err);
        return;
      }
      
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
          stmt.run([acc[0], acc[1] || ''], (err) => {
            if (err) console.error('Error inserting bank account:', err);
          });
        });
        stmt.finalize();
        console.log(`✅ ${bankAccountsData.length} bank accounts seeded`);
      } else {
        console.log(`✅ Bank accounts already exist (${row?.count || 0} records)`);
      }
    });
  }, 1000);

  // Get all
  router.get('/', requireAuth, (req, res) => {
    console.log('📥 Fetching all bank accounts');
    db.all('SELECT * FROM bank_accounts ORDER BY name', (err, rows) => {
      if (err) {
        console.error('❌ Error fetching bank accounts:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Found ${rows.length} bank accounts`);
      res.json(rows);
    });
  });

  // Add
  router.post('/', requireAuth, (req, res) => {
    console.log('📥 Adding bank account:', req.body);
    
    const { name, account_number } = req.body;
    
    if (!name || !account_number) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Name and account number are required' });
    }
    
    db.run(
      'INSERT INTO bank_accounts (name, account_number) VALUES (?, ?)',
      [name, account_number],
      function(err) {
        if (err) {
          console.error('❌ Error inserting bank account:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Bank account added with ID: ${this.lastID}`);
        res.json({ id: this.lastID, success: true });
      }
    );
  });

  // Update
  router.put('/:id', requireAuth, (req, res) => {
    console.log(`📥 Updating bank account ${req.params.id}:`, req.body);
    
    const { name, account_number } = req.body;
    
    db.run(
      'UPDATE bank_accounts SET name = ?, account_number = ? WHERE id = ?',
      [name, account_number, req.params.id],
      function(err) {
        if (err) {
          console.error('❌ Error updating bank account:', err);
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          console.error('❌ Bank account not found');
          return res.status(404).json({ error: 'Bank account not found' });
        }
        console.log(`✅ Bank account updated: ${this.changes} row(s) affected`);
        res.json({ success: true });
      }
    );
  });

  // Delete
  router.delete('/:id', requireAuth, (req, res) => {
    console.log(`📥 Deleting bank account ${req.params.id}`);
    
    db.run('DELETE FROM bank_accounts WHERE id = ?', req.params.id, function(err) {
      if (err) {
        console.error('❌ Error deleting bank account:', err);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        console.error('❌ Bank account not found');
        return res.status(404).json({ error: 'Bank account not found' });
      }
      console.log(`✅ Bank account deleted: ${this.changes} row(s) affected`);
      res.json({ success: true });
    });
  });

  return router;
}