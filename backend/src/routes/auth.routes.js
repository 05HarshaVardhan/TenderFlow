const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { registerCompanyAdminSchema, loginSchema } = require('../validation/authSchema');

const router = express.Router();

/**
 * HELPER: Generate clean user object for response
 * Prevents leaking passwordHash and fixes _doc nesting
 */
const getSafeUser = (user, company) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  companyId: company?._id || user.company,
  companyName: company?.name || user.companyName,
  emailVerified: user.emailVerified,
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    // req.user is populated by 'auth' middleware
    // We fetch a fresh lean copy to ensure no sensitive data is missed
    const user = await User.findById(req.user.id)
      .populate('company', 'name')
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        ...user,
        id: user._id, // Mapping _id to id for frontend consistency
        companyName: user.company?.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/register-company-admin
router.post('/register-company-admin', validate(registerCompanyAdminSchema), async (req, res) => {
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

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: 'Email already registered' });

    // 1. Create company
    const company = await Company.create({
      name: companyName,
      emailDomain: emailDomain.toLowerCase(),
      industry: industry || '',
      services: services || [],
      isVerified: false,
    });

    // 2. Hash password & generate verification token
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // 3. Create User
    const user = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: 'COMPANY_ADMIN',
      company: company._id,
      emailVerified: false,
      emailVerificationToken,
    });

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, companyId: company._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: getSafeUser(user, company),
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

    // Use .populate and .lean() for a clean start
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('company')
      .lean();

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role, companyId: user.company._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update lastLoginAt atomically
    await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() } });

    res.json({
      token,
      user: getSafeUser(user, user.company),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;