const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');

const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { registerCompanyAdminSchema, loginSchema } = require('../validation/authSchema');

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  // At this point req.user is guaranteed by auth middleware
  res.json({
    user: req.user,
  });
});

// Example protected route requiring COMPANY_ADMIN
router.get(
  '/company-admin-only',
  auth,
  requireRole('COMPANY_ADMIN'),
  (req, res) => {
    res.json({
      message: `Hello COMPANY_ADMIN of company ${req.user.companyName}`,
    });
  }
);


// POST /api/auth/register-company-admin
router.post('/register-company-admin', validate(registerCompanyAdminSchema) , async (req, res) => {
    try {
      const {
        companyName,
        emailDomain,
        industry,
        services,
        adminName,
        adminEmail,
        adminPassword,
      } = req.body;
  
      // 1. Basic validation
      if (!companyName || !emailDomain || !adminName || !adminEmail || !adminPassword) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      // 2. Check if user already exists
      const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
  
      // 3. Create company
      const company = await Company.create({
        name: companyName,
        emailDomain: emailDomain.toLowerCase(),
        industry: industry || '',
        services: services || [],
        isVerified: false,
      });
  
      // 4. Hash password
      const passwordHash = await bcrypt.hash(adminPassword, 10);
  
      // 5. Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationTokenExpiry = new Date();
      emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24); // 24 hours expiry
  
      // 6. Create COMPANY_ADMIN user
      const user = await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        passwordHash,
        role: 'COMPANY_ADMIN',
        company: company._id,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationTokenExpiry,
      });
  
      // 7. Generate JWT
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          companyId: company._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
  
      // TODO: EMAIL VERIFICATION IMPLEMENTATION
      // - Send verification email with link containing emailVerificationToken
      // - Create GET /api/auth/verify-email/:token endpoint
      // - Add middleware to check emailVerified before allowing critical actions
      // - Consider using nodemailer or similar email service
      // - Example verification link: /api/auth/verify-email?token=${emailVerificationToken}
  
      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: company._id,
          emailVerified: user.emailVerified,
        },
        company: {
          id: company._id,
          name: company.name,
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
  
      const user = await User.findOne({ email: email.toLowerCase() }).populate('company');
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          companyId: user.company._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
  
      // Optional: update lastLoginAt
      user.lastLoginAt = new Date();
      await user.save();
  
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.company._id,
          companyName: user.company.name,
          emailVerified: user.emailVerified,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
 
module.exports = router;
  