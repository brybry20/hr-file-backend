import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // Create birthdays table
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

  // Get all
  router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM birthdays ORDER BY name', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Add
  router.post('/', requireAuth, (req, res) => {
    const { name, position, date_started, regularized, date_of_birth } = req.body;
    
    db.run(
      'INSERT INTO birthdays (name, position, date_started, regularized, date_of_birth) VALUES (?, ?, ?, ?, ?)',
      [name, position, date_started, regularized, date_of_birth],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
      }
    );
  });

  // Update
  router.put('/:id', requireAuth, (req, res) => {
    const { name, position, date_started, regularized, date_of_birth } = req.body;
    
    db.run(
      'UPDATE birthdays SET name = ?, position = ?, date_started = ?, regularized = ?, date_of_birth = ? WHERE id = ?',
      [name, position, date_started, regularized, date_of_birth, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });

  // Delete
  router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM birthdays WHERE id = ?', req.params.id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  return router;
}