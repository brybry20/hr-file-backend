import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(ResignedEmployee) {
  // Get all resigned employees
  router.get('/', requireAuth, async (req, res) => {
    try {
      const resigned = await ResignedEmployee.find().sort({ resignation_date: -1 });
      res.json(resigned);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single resigned employee
  router.get('/:id', requireAuth, async (req, res) => {
    try {
      const resigned = await ResignedEmployee.findById(req.params.id);
      if (!resigned) {
        return res.status(404).json({ error: 'Resigned employee not found' });
      }
      res.json(resigned);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete resigned employee
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await ResignedEmployee.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Resigned employee not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}