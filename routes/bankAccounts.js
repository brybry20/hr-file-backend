import express from 'express';
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export default function(BankAccount) {
  // Get all bank accounts
  router.get('/', requireAuth, async (req, res) => {
    try {
      const accounts = await BankAccount.find().sort({ name: 1 });
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add new bank account
  router.post('/', requireAuth, async (req, res) => {
    const { name, account_number } = req.body;
    
    if (!name || !account_number) {
      return res.status(400).json({ error: 'Name and account number are required' });
    }
    
    try {
      const account = await BankAccount.create({ name, account_number });
      res.json({ id: account._id, success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update bank account
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, account_number } = req.body;
    
    try {
      const account = await BankAccount.findByIdAndUpdate(
        req.params.id,
        { name, account_number },
        { new: true }
      );
      
      if (!account) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete bank account
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const result = await BankAccount.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Bank account not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}