const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

// Schema for creating user
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid('TENDER_POSTER', 'BIDDER', 'AUDITOR', 'COMPANY_ADMIN')
    .required(),
  jobTitle: Joi.string().allow('', null),
  phone: Joi.string().allow('', null),
});

// Schema for updating user
const updateUserSchema = Joi.object({
  role: Joi.string()
    .valid('TENDER_POSTER', 'BIDDER', 'AUDITOR', 'COMPANY_ADMIN')
    .optional(),
  isActive: Joi.boolean().optional(),
  jobTitle: Joi.string().optional(),
  phone: Joi.string().optional(),
}).min(1); // At least one field

// POST /api/users - Create user in company (COMPANY_ADMIN only)
router.post(
  '/',
  auth,
  requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'),
  validate(createUserSchema),
  async (req, res) => {
    try {
      const { name, email, password, role, jobTitle, phone } = req.body;

      // Check email uniqueness
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      // COMPANY_ADMIN creates users for their company only
      const companyId = req.user.companyId;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        company: companyId,
        jobTitle,
        phone,
      });

      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user.toObject();
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/users/my-company - List company users
router.get('/my-company', auth, async (req, res) => {
  try {
    const users = await User.find({ company: req.user.companyId })
      .populate('company', 'name badge')
      .sort({ createdAt: -1 });

    // Remove passwords from response
    const safeUsers = users.map(({ passwordHash, ...user }) => user);

    res.json(safeUsers);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id - Update user (role, active status)
router.patch(
  '/:id',
  auth,
  requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'),
  validate(updateUserSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // COMPANY_ADMIN can only update users in their company
      if (
        req.user.role !== 'SUPER_ADMIN' &&
        user.company.toString() !== req.user.companyId.toString()
      ) {
        return res.status(403).json({ message: 'Forbidden: not your company user' });
      }

      // Apply updates
      if (updates.role) user.role = updates.role;
      if (updates.isActive !== undefined) user.isActive = updates.isActive;
      if (updates.jobTitle) user.jobTitle = updates.jobTitle;
      if (updates.phone) user.phone = updates.phone;

      await user.save();

      // Return without password
      const { passwordHash: _, ...userWithoutPassword } = user.toObject();
      res.json(userWithoutPassword);
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
