import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(Birthday) {
  // Get all birthdays
  router.get('/', requireAuth, async (req, res) => {
    try {
      const birthdays = await Birthday.find().sort({ name: 1 });
      res.json(birthdays);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add birthday
  router.post('/', requireAuth, async (req, res) => {
    const { name, position, date_started, regularized, date_of_birth } = req.body;
    
    try {
      const birthday = await Birthday.create({ name, position, date_started, regularized, date_of_birth });
      res.json({ id: birthday._id, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update birthday
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, position, date_started, regularized, date_of_birth } = req.body;
    
    try {
      const birthday = await Birthday.findByIdAndUpdate(
        req.params.id,
        { name, position, date_started, regularized, date_of_birth },
        { new: true }
      );
      
      if (!birthday) {
        return res.status(404).json({ error: 'Birthday record not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete birthday
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await Birthday.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Birthday record not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}