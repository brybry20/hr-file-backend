import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // Create table - DROP and recreate with correct columns
  db.run("DROP TABLE IF EXISTS bank_accounts", (err) => {
    if (err) {
      console.error('Error dropping table:', err);
    }
    
    // Create new table with correct columns
    db.run(`
      CREATE TABLE bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Error creating bank_accounts table:', err);
      } else {
        console.log('✅ Bank accounts table ready (correct columns)');
      }
    });
  });

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
    
    // Validate
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