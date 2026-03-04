const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  registerCompanyAdminSchema,
  loginSchema,
  registerSuperAdminSchema,
} = require('../validation/authSchema');
const { sendEmail } = require('../utils/email');

const router = express.Router();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PLATFORM_COMPANY_NAME = 'TenderFlow Platform';
const PLATFORM_COMPANY_DOMAIN = 'tenderflow.internal';

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
  profileImageUrl: user.profileImage?.url || null,
});

const getOrCreatePlatformCompany = async () => {
  let company = await Company.findOne({ emailDomain: PLATFORM_COMPANY_DOMAIN });
  if (company) return company;

  company = await Company.create({
    name: PLATFORM_COMPANY_NAME,
    emailDomain: PLATFORM_COMPANY_DOMAIN,
    industry: 'Software',
    services: ['Platform Administration'],
    isVerified: true,
  });

  return company;
};

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
      id: user._id, // Mapping _id to id for frontend consistency
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company?._id,
      companyName: user.company?.name,
      emailVerified: user.emailVerified,
      profileImageUrl: user.profileImage?.url || null,
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

    const normalizedAdminEmail = adminEmail.toLowerCase();
    const normalizedDomain = emailDomain.toLowerCase().replace(/^@/, '');
    const adminEmailDomain = normalizedAdminEmail.split('@')[1];

    if (adminEmailDomain !== normalizedDomain) {
      return res
        .status(400)
        .json({ message: 'Admin email must belong to the provided company domain' });
    }

    const existingUser = await User.findOne({ email: normalizedAdminEmail });
    if (existingUser) return res.status(409).json({ message: 'Email already registered' });

    const existingCompanyByDomain = await Company.findOne({ emailDomain: normalizedDomain }).lean();
    if (existingCompanyByDomain) {
      return res
        .status(409)
        .json({ message: 'A company with this email domain is already registered' });
    }

    const companyNameRegex = new RegExp(`^${escapeRegExp(companyName.trim())}$`, 'i');
    const existingCompanyByName = await Company.findOne({ name: companyNameRegex }).lean();
    if (existingCompanyByName) {
      return res
        .status(409)
        .json({ message: 'A company with this name is already registered' });
    }

    // 1. Create company
    const company = await Company.create({
      name: companyName.trim(),
      emailDomain: normalizedDomain,
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
      email: normalizedAdminEmail,
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

// POST /api/auth/register-super-admin
router.post('/register-super-admin', validate(registerSuperAdminSchema), async (req, res) => {
  try {
    const { name, email, password, setupKey } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (!process.env.SUPER_ADMIN_SETUP_KEY) {
      return res.status(500).json({ message: 'SUPER_ADMIN_SETUP_KEY is not configured' });
    }

    if (setupKey !== process.env.SUPER_ADMIN_SETUP_KEY) {
      return res.status(403).json({ message: 'Invalid setup key' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const company = await getOrCreatePlatformCompany();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'SUPER_ADMIN',
      company: company._id,
      emailVerified: true,
    });

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
    console.error('Super admin register error:', err);
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
    if (!user.isActive) return res.status(403).json({ message: 'Your account is blocked. Contact your Company Admin.' });

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

router.get('/test-email', async (req, res) => {
  try {
    await sendEmail({
      to: process.env.EMAIL_TEST_TO || process.env.EMAIL_FROM || process.env.GMAIL_SENDER || process.env.EMAIL_USER,
      subject: 'Test Email',
      html: '<h2>Email delivery is working correctly</h2>',
    });

    res.send('Email sent successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Email failed');
  }
});



module.exports = router;

