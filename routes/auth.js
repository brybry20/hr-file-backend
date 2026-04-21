import express from 'express';
const router = express.Router();

export default function(User) {
  // Login
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username, password });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session.userId = user._id;
      req.session.username = user.username;
      
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Session error' });
        }
        res.json({ success: true, username: user.username });
      });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Refresh token / check session
  router.get('/refresh', (req, res) => {
    if (req.session.userId) {
      return res.json({ 
        authenticated: true, 
        username: req.session.username 
      });
    }
    res.json({ authenticated: false });
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('hrfile.sid');
      res.json({ success: true });
    });
  });

  // Check auth status
  router.get('/status', (req, res) => {
    if (req.session.userId) {
      res.json({ authenticated: true, username: req.session.username });
    } else {
      res.json({ authenticated: false });
    }
  });

  return router;
}