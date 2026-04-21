import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(Hardware) {
  // Get all hardware
  router.get('/', requireAuth, async (req, res) => {
    try {
      const hardware = await Hardware.find().sort({ hardware_type: 1, brand: 1 });
      res.json(hardware);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add hardware
  router.post('/', requireAuth, async (req, res) => {
    try {
      const item = await Hardware.create(req.body);
      res.json({ id: item._id, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update hardware
  router.put('/:id', requireAuth, async (req, res) => {
    try {
      const item = await Hardware.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!item) {
        return res.status(404).json({ error: 'Hardware item not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete hardware
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await Hardware.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Hardware item not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}