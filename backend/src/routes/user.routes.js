
//backend\src\routes\user.routes.js
const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcrypt');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { sendEmail } = require('../utils/email');
const { uploadSingle } = require('../middleware/upload');
const { deleteFile } = require('../utils/cloudinary');

const router = express.Router();

const getManagedUserQuery = (req, userId) => (
  req.user.role === 'SUPER_ADMIN'
    ? { _id: userId }
    : { _id: userId, company: req.user.companyId }
);

const sendUserLifecycleEmail = async ({ to, companyName, action }) => {
  const actionMap = {
    blocked: {
      subject: 'Your TenderFlow account has been blocked',
      html: `
        <h2>Account Access Update</h2>
        <p>Your account in <strong>${companyName || 'your company'}</strong> has been blocked by your Company Admin.</p>
        <p>If this was unexpected, please contact your Company Admin.</p>
      `
    },
    unblocked: {
      subject: 'Your TenderFlow account has been reactivated',
      html: `
        <h2>Account Access Restored</h2>
        <p>Your account in <strong>${companyName || 'your company'}</strong> has been reactivated by your Company Admin.</p>
        <p>You can now log in again.</p>
      `
    },
    removed: {
      subject: 'Your TenderFlow account has been removed',
      html: `
        <h2>Account Removed</h2>
        <p>Your account in <strong>${companyName || 'your company'}</strong> has been removed by your Company Admin.</p>
        <p>If you need access again, please contact your Company Admin.</p>
      `
    }
  };

  const template = actionMap[action];
  if (!template) return;

  await sendEmail({
    to,
    subject: template.subject,
    html: template.html
  });
};

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
      const normalizedEmail = email.toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail }).select('company');
      if (existingUser) {
        const sameCompany = String(existingUser.company) === String(req.user.companyId);
        return res.status(409).json({
          code: sameCompany ? 'EMAIL_IN_USE_IN_COMPANY' : 'EMAIL_IN_USE_GLOBAL',
          message: sameCompany
            ? 'This email is already assigned to an employee in your company.'
            : 'This email is already registered in TenderFlow.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        company: req.user.companyId,
        jobTitle,
        phone,
      });

      await sendEmail({
  to: normalizedEmail,
  subject: 'Welcome to TenderFlow',
  html: `
    <h2>Welcome to ${req.user.companyName}</h2>
    <p>Your account has been created by your Company Admin.</p>
    <p><strong>Login Credentials:</strong></p>
    <p>Email: ${normalizedEmail}</p>
    <p>Password: ${password}</p>
    <br/>
    <p>Please login and change your password after first login.</p>
  `,
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
    const query = req.user.role === 'SUPER_ADMIN' ? {} : { company: req.user.companyId };
    const users = await User.find(query)
      .select('name email role jobTitle phone isActive createdAt company')
      .populate('company', 'name emailDomain')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = users.map((user) => ({
      ...user,
      company: user.company
        ? {
            _id: user.company._id,
            name: user.company.name,
            emailDomain: user.company.emailDomain,
          }
        : null,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ message: 'Server error fetching team members' });
  }
});

// GET /api/users/admin/users-by-company - Super admin grouped user management
router.get('/admin/users-by-company', auth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const [companies, users] = await Promise.all([
      Company.find({})
        .select('name emailDomain industry services isVerified createdAt')
        .sort({ name: 1 })
        .lean(),
      User.find({})
        .select('name email role jobTitle phone isActive createdAt company')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const usersByCompanyId = users.reduce((acc, user) => {
      const key = String(user.company || '');
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(user);
      return acc;
    }, new Map());

    const data = companies.map((company) => ({
      company: {
        _id: company._id,
        name: company.name,
        emailDomain: company.emailDomain,
        industry: company.industry || '',
        services: company.services || [],
        isVerified: !!company.isVerified,
        createdAt: company.createdAt,
      },
      users: usersByCompanyId.get(String(company._id)) || [],
    }));

    return res.json({
      totalCompanies: companies.length,
      totalUsers: users.length,
      companies: data,
    });
  } catch (err) {
    console.error('Admin users-by-company error:', err);
    return res.status(500).json({ message: 'Failed to fetch users grouped by company' });
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

// PATCH /api/users/:id/block - Block user (COMPANY_ADMIN, SUPER_ADMIN)
router.patch('/:id/block', auth, requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ message: 'You cannot block your own account.' });
    }

    const user = await User.findOne(getManagedUserQuery(req, id))
      .populate('company', 'name')
      .select('email isActive role company');
    if (!user) {
      return res.status(404).json({ message: 'User not found or unauthorized.' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admin can block another super admin.' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'User is already blocked.' });
    }

    user.isActive = false;
    await user.save();
    sendUserLifecycleEmail({
      to: user.email,
      companyName: user.company?.name || req.user.companyName,
      action: 'blocked'
    }).catch((mailErr) => {
      console.error('Block user email notify failed:', mailErr.message);
    });

    return res.json({ message: 'User blocked. Email notification attempted.' });
  } catch (err) {
    console.error('Block user error:', err);
    return res.status(500).json({ message: 'Failed to block user' });
  }
});

// PATCH /api/users/:id/unblock - Reactivate user (COMPANY_ADMIN, SUPER_ADMIN)
router.patch('/:id/unblock', auth, requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const user = await User.findOne(getManagedUserQuery(req, id))
      .populate('company', 'name')
      .select('email isActive role company');
    if (!user) {
      return res.status(404).json({ message: 'User not found or unauthorized.' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admin can unblock another super admin.' });
    }

    if (user.isActive) {
      return res.status(400).json({ message: 'User is already active.' });
    }

    user.isActive = true;
    await user.save();
    sendUserLifecycleEmail({
      to: user.email,
      companyName: user.company?.name || req.user.companyName,
      action: 'unblocked'
    }).catch((mailErr) => {
      console.error('Unblock user email notify failed:', mailErr.message);
    });

    return res.json({ message: 'User unblocked. Email notification attempted.' });
  } catch (err) {
    console.error('Unblock user error:', err);
    return res.status(500).json({ message: 'Failed to unblock user' });
  }
});

// DELETE /api/users/:id - Remove user (COMPANY_ADMIN, SUPER_ADMIN)
router.delete('/:id', auth, requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ message: 'You cannot remove your own account.' });
    }

    const user = await User.findOne(getManagedUserQuery(req, id))
      .populate('company', 'name')
      .select('email role company');
    if (!user) {
      return res.status(404).json({ message: 'User not found or unauthorized.' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admin can remove another super admin.' });
    }

    if (user.role === 'SUPER_ADMIN') {
      const totalSuperAdmins = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (totalSuperAdmins <= 1) {
        return res.status(400).json({ message: 'Cannot remove the last super admin.' });
      }
    }

    await User.deleteOne({ _id: user._id });
    sendUserLifecycleEmail({
      to: user.email,
      companyName: user.company?.name || req.user.companyName,
      action: 'removed'
    }).catch((mailErr) => {
      console.error('Remove user email notify failed:', mailErr.message);
    });

    return res.json({ message: 'User removed. Email notification attempted.' });
  } catch (err) {
    console.error('Remove user error:', err);
    return res.status(500).json({ message: 'Failed to remove user' });
  }
});

// PATCH /api/users/me/profile-photo - Upload/update current user's profile photo
router.patch('/me/profile-photo', auth, uploadSingle('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Profile image file is required.' });
    }

    if (!req.file.mimetype?.startsWith('image/')) {
      if (req.file.filename) {
        await deleteFile(req.file.filename);
      }
      return res.status(400).json({ message: 'Only image files are allowed for profile photo.' });
    }

    const user = await User.findById(req.user.id).select('profileImage');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldPublicId = user.profileImage?.publicId;
    user.profileImage = {
      url: req.file.path,
      publicId: req.file.filename,
    };
    await user.save();

    if (oldPublicId && oldPublicId !== req.file.filename) {
      await deleteFile(oldPublicId);
    }

    return res.json({
      message: 'Profile photo updated successfully',
      profileImageUrl: user.profileImage.url,
    });
  } catch (err) {
    console.error('Profile photo upload error:', err);
    return res.status(500).json({ message: 'Failed to upload profile photo' });
  }
});

// DELETE /api/users/me/profile-photo - Remove current user's profile photo
router.delete('/me/profile-photo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('profileImage');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const publicId = user.profileImage?.publicId;
    user.profileImage = undefined;
    await user.save();

    if (publicId) {
      await deleteFile(publicId);
    }

    return res.json({ message: 'Profile photo removed successfully' });
  } catch (err) {
    console.error('Profile photo delete error:', err);
    return res.status(500).json({ message: 'Failed to remove profile photo' });
  }
});

module.exports = router;
