import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(Employee, ResignedEmployee) {
  // Get all active employees
  router.get('/', requireAuth, async (req, res) => {
    try {
      const employees = await Employee.find().sort({ name: 1 });
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single employee
  router.get('/:id', requireAuth, async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new employee
  router.post('/', requireAuth, async (req, res) => {
    try {
      const employee = await Employee.create(req.body);
      res.json({ id: employee._id, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update employee
  router.put('/:id', requireAuth, async (req, res) => {
    try {
      const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Move employee to resigned
  router.post('/:id/resign', requireAuth, async (req, res) => {
    const { resignation_date, reason } = req.body;

    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Create resigned employee record
      await ResignedEmployee.create({
        original_id: employee._id,
        name: employee.name,
        position: employee.position,
        diploma: employee.diploma,
        date_started: employee.date_started,
        date_regularized: employee.date_regularized,
        employment_status: employee.employment_status,
        salary: employee.salary,
        sss: employee.sss,
        philhealth: employee.philhealth,
        pagibig: employee.pagibig,
        tin: employee.tin,
        cp_viber: employee.cp_viber,
        official_email: employee.official_email,
        home_address: employee.home_address,
        resignation_date: resignation_date,
        reason: reason
      });

      // Delete from active employees
      await Employee.findByIdAndDelete(req.params.id);
      
      res.json({ success: true, message: 'Employee moved to resigned' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete employee permanently
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await Employee.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}