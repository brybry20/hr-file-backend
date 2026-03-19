import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // Create cars table
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

  // Get all
  router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM cars_inventory ORDER BY assigned_to', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Add
  router.post('/', requireAuth, (req, res) => {
    const { assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct } = req.body;
    
    db.run(
      `INSERT INTO cars_inventory 
       (assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
      }
    );
  });

  // Update
  router.put('/:id', requireAuth, (req, res) => {
    const { assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct } = req.body;
    
    db.run(
      `UPDATE cars_inventory SET 
       assigned_to = ?, type_of_car = ?, plate_number = ?, 
       autosweep_acct = ?, card_no = ?, easytrip_acct = ? 
       WHERE id = ?`,
      [assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });

  // Delete
  router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM cars_inventory WHERE id = ?', req.params.id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  return router;
}