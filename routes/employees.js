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
  // Get all active employees
  router.get('/', requireAuth, (req, res) => {
    db.all('SELECT * FROM employees ORDER BY name', (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // Get single employee
  router.get('/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(row);
    });
  });

  // Create new employee
  router.post('/', requireAuth, (req, res) => {
    const {
      name, position, diploma, date_started, date_regularized,
      employment_status, salary, sss, philhealth, pagibig, tin,
      cp_viber, official_email, home_address
    } = req.body;

    db.run(
      `INSERT INTO employees (
        name, position, diploma, date_started, date_regularized,
        employment_status, salary, sss, philhealth, pagibig, tin,
        cp_viber, official_email, home_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, position, diploma, date_started, date_regularized,
       employment_status, salary, sss, philhealth, pagibig, tin,
       cp_viber, official_email, home_address],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, success: true });
      }
    );
  });

  // Update employee
  router.put('/:id', requireAuth, (req, res) => {
    const {
      name, position, diploma, date_started, date_regularized,
      employment_status, salary, sss, philhealth, pagibig, tin,
      cp_viber, official_email, home_address
    } = req.body;

    db.run(
      `UPDATE employees SET
        name = ?, position = ?, diploma = ?, date_started = ?,
        date_regularized = ?, employment_status = ?, salary = ?,
        sss = ?, philhealth = ?, pagibig = ?, tin = ?,
        cp_viber = ?, official_email = ?, home_address = ?
      WHERE id = ?`,
      [name, position, diploma, date_started, date_regularized,
       employment_status, salary, sss, philhealth, pagibig, tin,
       cp_viber, official_email, home_address, req.params.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
      }
    );
  });

  // Move employee to resigned
  router.post('/:id/resign', requireAuth, (req, res) => {
    const { resignation_date, reason } = req.body;
    const employeeId = req.params.id;

    db.get('SELECT * FROM employees WHERE id = ?', [employeeId], (err, employee) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      db.run(
        `INSERT INTO resigned_employees (
          original_id, name, position, diploma, date_started, date_regularized,
          employment_status, salary, sss, philhealth, pagibig, tin,
          cp_viber, official_email, home_address, resignation_date, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee.id, employee.name, employee.position, employee.diploma,
         employee.date_started, employee.date_regularized, employee.employment_status,
         employee.salary, employee.sss, employee.philhealth, employee.pagibig,
         employee.tin, employee.cp_viber, employee.official_email, employee.home_address,
         resignation_date, reason],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          db.run('DELETE FROM employees WHERE id = ?', [employeeId], (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Employee moved to resigned' });
          });
        }
      );
    });
  });

  // Delete employee
  router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM employees WHERE id = ?', req.params.id, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });

  return router;
}