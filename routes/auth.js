import express from 'express';
const router = express.Router();

export default function(db) {
  // Login
  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        
        // Save session explicitly
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ error: 'Session error' });
          }
          res.json({ success: true, username: user.username });
        });
      }
    );
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
  router.get('/check-auth', (req, res) => {
    if (req.session.userId) {
      res.json({ authenticated: true, username: req.session.username });
    } else {
      res.json({ authenticated: false });
    }
  });

  return router;
}