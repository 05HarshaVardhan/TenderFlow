// routes/authRoutes.js
const {User} = require('../models'); // <--- Make sure this path is correct
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');
const authMiddleware = require('../middleware/auth.js')
// Sign up a new user
const validate = require('../middleware/validate');
const { signupSchema } = require('../validators/authSchema');
const { loginSchema } = require('../validators/authSchema');
router.post('/signup', validate(signupSchema), authController.signup);


// Log in an existing user
router.post('/login',validate(loginSchema), authController.login);

// Log out a user
router.post('/join-company', authMiddleware, authController.joinCompany);

router.post('/logout', authController.logout);
router.get('/me', authMiddleware, async (req, res) => {
    try {
      // req.user should be populated by your authMiddleware
      // It should ideally contain at least userId.
      const userId = req.user.userId; // Make sure your JWT payload includes userId
  
      // Fetch the user from the database to get their companyId
      // In backend/routes/auth.routes.js
// ...
    const user = await User.findByPk(userId, {
        // Request 'fullName' instead of 'name' and remove 'username' if it doesn't exist
        attributes: ['id', 'fullName', 'email', 'companyId'] // <--- UPDATED!
      });
  // ...
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Return the user's relevant data, including companyId
      res.status(200).json({
        success: true,
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        companyId: user.companyId // <--- CRITICAL: Frontend relies on this
      });
  
    } catch (err) {
      console.error("Error fetching user data for /me endpoint:", err);
      res.status(500).json({ success: false, message: 'Server error while fetching user data' });
    }
  });
  

module.exports = router;
