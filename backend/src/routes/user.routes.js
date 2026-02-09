
//backend\src\routes\user.routes.js
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
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(409).json({ message: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        company: req.user.companyId,
        jobTitle,
        phone,
      });

      // CLEANUP: Convert to object and delete passwordHash manually for creation
      const userObj = user.toObject();
      delete userObj.passwordHash;
      res.status(201).json(userObj);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/users/my-company - List company users
router.get('/my-company', auth, async (req, res) => {
  try {
    // If Super Admin, they can see everyone; otherwise, filter by company
    const query = req.user.role === 'SUPER_ADMIN' ? {} : { company: req.user.companyId };

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching team' });
  }
});

// PATCH /api/users/:id - Update user
router.patch(
  '/:id',
  auth,
  requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'),
  validate(updateUserSchema),
  async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Perform the update atomically
      // By including 'company' in the filter, we ensure a COMPANY_ADMIN 
      // can only find/update users belonging to their own company.
      const query = { _id: id };
      if (req.user.role !== 'SUPER_ADMIN') {
        query.company = req.user.companyId;
      }

      const updatedUser = await User.findOneAndUpdate(
        query,
        { $set: req.body },
        { 
          new: true,           // Return the document AFTER update
          runValidators: true, // Ensure Joi-validated data also passes Mongoose schema rules
          select: '-passwordHash' // Security: strip password
        }
      ).lean(); // Returns a clean JSON object for the frontend

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found or unauthorized' });
      }

      // 2. Return the clean object
      res.json(updatedUser);
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
module.exports = router;
