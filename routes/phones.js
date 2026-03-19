import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // Create phones table
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

  // Get all
  router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM phone_inventory ORDER BY name', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Add
  router.post('/', requireAuth, (req, res) => {
    const { name, unit, serial_number, cellphone_number } = req.body;
    
    db.run(
      'INSERT INTO phone_inventory (name, unit, serial_number, cellphone_number) VALUES (?, ?, ?, ?)',
      [name, unit, serial_number, cellphone_number],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
      }
    );
  });

  // Update
  router.put('/:id', requireAuth, (req, res) => {
    const { name, unit, serial_number, cellphone_number } = req.body;
    
    db.run(
      'UPDATE phone_inventory SET name = ?, unit = ?, serial_number = ?, cellphone_number = ? WHERE id = ?',
      [name, unit, serial_number, cellphone_number, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });

  // Delete
  router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM phone_inventory WHERE id = ?', req.params.id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  return router;
}