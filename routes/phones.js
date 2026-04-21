import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(Phone) {
  // Get all phones
  router.get('/', requireAuth, async (req, res) => {
    try {
      const phones = await Phone.find().sort({ name: 1 });
      res.json(phones);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add phone
  router.post('/', requireAuth, async (req, res) => {
    const { name, unit, serial_number, cellphone_number } = req.body;
    
    try {
      const phone = await Phone.create({ name, unit, serial_number, cellphone_number });
      res.json({ id: phone._id, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update phone
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, unit, serial_number, cellphone_number } = req.body;
    
    try {
      const phone = await Phone.findByIdAndUpdate(
        req.params.id,
        { name, unit, serial_number, cellphone_number },
        { new: true }
      );
      
      if (!phone) {
        return res.status(404).json({ error: 'Phone not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete phone
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await Phone.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Phone not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}