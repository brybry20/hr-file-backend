import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(db) {
  // Create hardware table with exact columns from example
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

  // Get all
  router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM hardware_inventory ORDER BY hardware_type, brand', (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // Add
  router.post('/', requireAuth, (req, res) => {
    const {
      hardware_type, windows_hostname, brand, serial_number,
      windows_version, windows_language, keyboard_type, year_of_purchase,
      clarilog_installed, comment, computer_at_office, location_at_office,
      never_at_office, home_office_plus, multiple_users, single_user, user_fullname
    } = req.body;

    db.run(
      `INSERT INTO hardware_inventory (
        hardware_type, windows_hostname, brand, serial_number,
        windows_version, windows_language, keyboard_type, year_of_purchase,
        clarilog_installed, comment, computer_at_office, location_at_office,
        never_at_office, home_office_plus, multiple_users, single_user, user_fullname
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [hardware_type, windows_hostname, brand, serial_number,
       windows_version, windows_language, keyboard_type, year_of_purchase,
       clarilog_installed, comment, computer_at_office, location_at_office,
       never_at_office, home_office_plus, multiple_users, single_user, user_fullname],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
      }
    );
  });

  // Update
  router.put('/:id', requireAuth, (req, res) => {
    const {
      hardware_type, windows_hostname, brand, serial_number,
      windows_version, windows_language, keyboard_type, year_of_purchase,
      clarilog_installed, comment, computer_at_office, location_at_office,
      never_at_office, home_office_plus, multiple_users, single_user, user_fullname
    } = req.body;

    db.run(
      `UPDATE hardware_inventory SET
        hardware_type = ?, windows_hostname = ?, brand = ?, serial_number = ?,
        windows_version = ?, windows_language = ?, keyboard_type = ?, year_of_purchase = ?,
        clarilog_installed = ?, comment = ?, computer_at_office = ?, location_at_office = ?,
        never_at_office = ?, home_office_plus = ?, multiple_users = ?, single_user = ?, user_fullname = ?
      WHERE id = ?`,
      [hardware_type, windows_hostname, brand, serial_number,
       windows_version, windows_language, keyboard_type, year_of_purchase,
       clarilog_installed, comment, computer_at_office, location_at_office,
       never_at_office, home_office_plus, multiple_users, single_user, user_fullname,
       req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });

  // Delete
  router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM hardware_inventory WHERE id = ?', req.params.id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  return router;
}