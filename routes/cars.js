import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(Car) {
  // Get all cars
  router.get('/', requireAuth, async (req, res) => {
    try {
      const cars = await Car.find().sort({ assigned_to: 1 });
      res.json(cars);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add car
  router.post('/', requireAuth, async (req, res) => {
    const { assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct } = req.body;
    
    try {
      const car = await Car.create({ assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct });
      res.json({ id: car._id, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update car
  router.put('/:id', requireAuth, async (req, res) => {
    const { assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct } = req.body;
    
    try {
      const car = await Car.findByIdAndUpdate(
        req.params.id,
        { assigned_to, type_of_car, plate_number, autosweep_acct, card_no, easytrip_acct },
        { new: true }
      );
      
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete car
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await Car.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Car not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}