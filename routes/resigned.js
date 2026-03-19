import express from 'express';
const router = express.Router();

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // Get all resigned employees
  router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM resigned_employees ORDER BY resignation_date DESC', (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // Get single resigned employee
  router.get('/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM resigned_employees WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Resigned employee not found' });
      }
      res.json(row);
    });
  });

  // Delete resigned employee
  router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM resigned_employees WHERE id = ?', req.params.id, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });

  return router;
}