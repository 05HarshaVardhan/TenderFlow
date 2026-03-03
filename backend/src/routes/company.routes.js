const express = require('express');
const Joi = require('joi');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const Team = require('../models/Team');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { uploadSingle } = require('../middleware/upload');
const { deleteFile } = require('../utils/cloudinary');

const router = express.Router();

const profileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).optional(),
  industry: Joi.string().trim().max(120).allow('', null).optional(),
  services: Joi.array().items(Joi.string().trim().min(2).max(100)).max(25).optional(),
  bio: Joi.string().trim().max(2000).allow('', null).optional(),
  website: Joi.string().trim().uri({ scheme: ['http', 'https'] }).allow('', null).optional(),
  registrationNumber: Joi.string().trim().max(120).allow('', null).optional(),
  contactEmail: Joi.string().trim().email().allow('', null).optional(),
  contactPhone: Joi.string().trim().max(40).allow('', null).optional(),
  location: Joi.object({
    country: Joi.string().trim().max(120).allow('', null).optional(),
    state: Joi.string().trim().max(120).allow('', null).optional(),
    city: Joi.string().trim().max(120).allow('', null).optional(),
  }).optional(),
  emailDomain: Joi.any().forbidden(),
}).min(1);

const certCreateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(1000).allow('', null).optional(),
  issuedBy: Joi.string().trim().max(200).allow('', null).optional(),
  validFrom: Joi.date().iso().allow('', null).optional(),
  validTill: Joi.date().iso().allow('', null).optional(),
  isPublic: Joi.boolean().default(true),
});

const certUpdateSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).optional(),
  description: Joi.string().trim().max(1000).allow('', null).optional(),
  issuedBy: Joi.string().trim().max(200).allow('', null).optional(),
  validFrom: Joi.date().iso().allow('', null).optional(),
  validTill: Joi.date().iso().allow('', null).optional(),
  isPublic: Joi.boolean().optional(),
}).min(1);

const adminCreateCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  emailDomain: Joi.string()
    .trim()
    .lowercase()
    .replace(/^@/, '')
    .domain({ tlds: { allow: false } })
    .required(),
  industry: Joi.string().trim().max(120).allow('', null).optional(),
  services: Joi.array().items(Joi.string().trim().min(2).max(100)).max(25).default([]),
  isVerified: Joi.boolean().default(false),
});

const toCompanySettingsResponse = (company) => ({
  id: company._id,
  name: company.name,
  emailDomain: company.emailDomain,
  industry: company.industry || '',
  services: company.services || [],
  bio: company.bio || '',
  website: company.website || '',
  registrationNumber: company.registrationNumber || '',
  contactEmail: company.contactEmail || '',
  contactPhone: company.contactPhone || '',
  location: company.location || {},
  logoUrl: company.logo?.url || null,
  certificates: (company.certificates || []).map((cert) => ({
    id: cert._id,
    title: cert.title,
    description: cert.description || '',
    fileUrl: cert.fileUrl,
    isPublic: cert.isPublic !== false,
    issuedBy: cert.issuedBy || '',
    validFrom: cert.validFrom || null,
    validTill: cert.validTill || null,
    createdAt: cert.createdAt,
  })),
});

const toPublicCompanyProfile = (company) => ({
  id: company._id,
  name: company.name,
  industry: company.industry || '',
  services: company.services || [],
  bio: company.bio || '',
  website: company.website || '',
  location: {
    country: company.location?.country || '',
    state: company.location?.state || '',
    city: company.location?.city || '',
  },
  logoUrl: company.logo?.url || null,
  badge: company.badge || 'PENDING',
  isVerified: !!company.isVerified,
  certificates: (company.certificates || [])
    .filter((cert) => cert.isPublic !== false)
    .map((cert) => ({
      id: cert._id,
      title: cert.title,
      description: cert.description || '',
      fileUrl: cert.fileUrl,
      issuedBy: cert.issuedBy || '',
      validFrom: cert.validFrom || null,
      validTill: cert.validTill || null,
      createdAt: cert.createdAt,
    })),
});

router.get('/public/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });

    return res.json(toPublicCompanyProfile(company));
  } catch (err) {
    console.error('Get public company profile error:', err);
    return res.status(500).json({ message: 'Failed to fetch company profile' });
  }
});

// GET /api/companies/admin/all - Super admin list all companies with counts
router.get('/admin/all', auth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const [companies, userCounts, tenderCounts, bidCounts, teamCounts] = await Promise.all([
      Company.find({})
        .sort({ createdAt: -1 })
        .lean(),
      User.aggregate([{ $group: { _id: '$company', count: { $sum: 1 } } }]),
      Tender.aggregate([{ $group: { _id: '$ownerCompany', count: { $sum: 1 } } }]),
      Bid.aggregate([{ $group: { _id: '$bidderCompany', count: { $sum: 1 } } }]),
      Team.aggregate([{ $group: { _id: '$company', count: { $sum: 1 } } }]),
    ]);

    const toCountMap = (items) => new Map((items || []).map((item) => [String(item._id), item.count]));
    const userCountMap = toCountMap(userCounts);
    const tenderCountMap = toCountMap(tenderCounts);
    const bidCountMap = toCountMap(bidCounts);
    const teamCountMap = toCountMap(teamCounts);

    const rows = companies.map((company) => ({
      ...toCompanySettingsResponse(company),
      usage: {
        users: userCountMap.get(String(company._id)) || 0,
        tenders: tenderCountMap.get(String(company._id)) || 0,
        bids: bidCountMap.get(String(company._id)) || 0,
        teams: teamCountMap.get(String(company._id)) || 0,
      },
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }));

    return res.json({
      total: rows.length,
      companies: rows,
    });
  } catch (err) {
    console.error('Super admin company list error:', err);
    return res.status(500).json({ message: 'Failed to fetch companies' });
  }
});

// POST /api/companies/admin - Super admin create a company
router.post('/admin', auth, requireRole('SUPER_ADMIN'), validate(adminCreateCompanySchema), async (req, res) => {
  try {
    const { name, emailDomain, industry, services, isVerified } = req.body;
    const normalizedName = name.trim();
    const normalizedDomain = emailDomain.toLowerCase().replace(/^@/, '');
    const normalizedServices = Array.from(
      new Set((services || []).map((item) => String(item).trim()).filter(Boolean))
    );

    const existingByDomain = await Company.findOne({ emailDomain: normalizedDomain }).lean();
    if (existingByDomain) {
      return res.status(409).json({ message: 'A company with this email domain already exists.' });
    }

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingByName = await Company.findOne({ name: new RegExp(`^${escapedName}$`, 'i') }).lean();
    if (existingByName) {
      return res.status(409).json({ message: 'A company with this name already exists.' });
    }

    const company = await Company.create({
      name: normalizedName,
      emailDomain: normalizedDomain,
      industry: industry || '',
      services: normalizedServices,
      isVerified: !!isVerified,
      badge: isVerified ? 'VERIFIED' : 'PENDING',
    });

    return res.status(201).json({
      message: 'Company created successfully',
      company: toCompanySettingsResponse(company),
    });
  } catch (err) {
    console.error('Super admin create company error:', err);
    return res.status(500).json({ message: 'Failed to create company' });
  }
});

// PATCH /api/companies/admin/:companyId - Super admin update company details
router.patch('/admin/:companyId', auth, requireRole('SUPER_ADMIN'), validate(profileSchema), async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }

    const payload = { ...req.body };
    delete payload.emailDomain;

    if (Object.prototype.hasOwnProperty.call(payload, 'services')) {
      const seen = new Set();
      payload.services = (payload.services || []).filter((item) => {
        const normalized = String(item).toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    return res.json({
      message: 'Company updated',
      company: toCompanySettingsResponse(company),
    });
  } catch (err) {
    console.error('Super admin update company error:', err);
    return res.status(500).json({ message: 'Failed to update company' });
  }
});

// DELETE /api/companies/admin/:companyId - Super admin remove company (supports ?force=true)
router.delete('/admin/:companyId', auth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const force = String(req.query.force || 'false').toLowerCase() === 'true';

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const [usersCount, tendersCount, bidsCount, teamsCount, superAdminCount] = await Promise.all([
      User.countDocuments({ company: companyId }),
      Tender.countDocuments({ ownerCompany: companyId }),
      Bid.countDocuments({ bidderCompany: companyId }),
      Team.countDocuments({ company: companyId }),
      User.countDocuments({ company: companyId, role: 'SUPER_ADMIN' }),
    ]);

    if (superAdminCount > 0) {
      return res.status(400).json({ message: 'Cannot delete a company that contains super admin users.' });
    }

    const usage = { users: usersCount, tenders: tendersCount, bids: bidsCount, teams: teamsCount };
    const hasUsage = Object.values(usage).some((value) => value > 0);

    if (!force && hasUsage) {
      return res.status(409).json({
        message: 'Company has related records. Retry with ?force=true to delete all related data.',
        usage,
      });
    }

    const users = await User.find({ company: companyId }).select('_id').lean();
    const userIds = users.map((item) => item._id);
    const ownedTenders = await Tender.find({ ownerCompany: companyId }).select('_id').lean();
    const tenderIds = ownedTenders.map((item) => item._id);

    await Promise.all([
      Notification.deleteMany({ user: { $in: userIds } }),
      Message.deleteMany({
        $or: [
          { sender: { $in: userIds } },
          { recipients: { $in: userIds } },
          { 'readBy.user': { $in: userIds } },
        ],
      }),
      Team.deleteMany({ company: companyId }),
      Bid.deleteMany({
        $or: [
          { bidderCompany: companyId },
          { submittedBy: { $in: userIds } },
          { tender: { $in: tenderIds } },
        ],
      }),
      Tender.deleteMany({ ownerCompany: companyId }),
      User.deleteMany({ company: companyId }),
      Company.deleteOne({ _id: companyId }),
    ]);

    return res.json({
      message: 'Company and related data removed successfully',
      usage,
      force,
    });
  } catch (err) {
    console.error('Super admin delete company error:', err);
    return res.status(500).json({ message: 'Failed to delete company' });
  }
});

router.get('/me', auth, requireRole('COMPANY_ADMIN'), async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId).lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    return res.json(toCompanySettingsResponse(company));
  } catch (err) {
    console.error('Get company settings error:', err);
    return res.status(500).json({ message: 'Failed to fetch company settings' });
  }
});

router.patch('/me', auth, requireRole('COMPANY_ADMIN'), validate(profileSchema), async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    delete updatePayload.emailDomain;

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'services')) {
      const seen = new Set();
      updatePayload.services = (updatePayload.services || []).filter((item) => {
        const normalized = String(item).toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();

    if (!company) return res.status(404).json({ message: 'Company not found' });
    return res.json({
      message: 'Company profile updated',
      company: toCompanySettingsResponse(company),
    });
  } catch (err) {
    console.error('Update company settings error:', err);
    return res.status(500).json({ message: 'Failed to update company settings' });
  }
});

router.patch('/me/logo', auth, requireRole('COMPANY_ADMIN'), uploadSingle('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Logo file is required' });
    if (!req.file.mimetype?.startsWith('image/')) {
      if (req.file.filename) await deleteFile(req.file.filename);
      return res.status(400).json({ message: 'Only image files are allowed for company logo' });
    }

    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const oldPublicId = company.logo?.publicId;
    company.logo = { url: req.file.path, publicId: req.file.filename };
    await company.save();

    if (oldPublicId && oldPublicId !== req.file.filename) {
      await deleteFile(oldPublicId);
    }

    return res.json({ message: 'Company logo updated', logoUrl: company.logo.url });
  } catch (err) {
    console.error('Upload company logo error:', err);
    return res.status(500).json({ message: 'Failed to upload company logo' });
  }
});

router.delete('/me/logo', auth, requireRole('COMPANY_ADMIN'), async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const publicId = company.logo?.publicId;
    company.logo = undefined;
    await company.save();

    if (publicId) await deleteFile(publicId);
    return res.json({ message: 'Company logo removed' });
  } catch (err) {
    console.error('Delete company logo error:', err);
    return res.status(500).json({ message: 'Failed to remove company logo' });
  }
});

router.post(
  '/me/certificates',
  auth,
  requireRole('COMPANY_ADMIN'),
  uploadSingle('certificateFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Certificate file is required' });
      }

      const { error, value } = certCreateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        await deleteFile(req.file.filename);
        return res.status(400).json({
          message: 'Validation error',
          details: error.details.map((d) => ({ message: d.message, path: d.path })),
        });
      }

      const company = await Company.findById(req.user.companyId);
      if (!company) return res.status(404).json({ message: 'Company not found' });

      company.certificates.push({
        title: value.title,
        description: value.description || '',
        issuedBy: value.issuedBy || '',
        validFrom: value.validFrom || null,
        validTill: value.validTill || null,
        isPublic: value.isPublic !== false,
        fileUrl: req.file.path,
        filePublicId: req.file.filename,
      });

      await company.save();
      const certificate = company.certificates[company.certificates.length - 1];

      return res.status(201).json({
        message: 'Certificate uploaded',
        certificate: {
          id: certificate._id,
          title: certificate.title,
          description: certificate.description,
          fileUrl: certificate.fileUrl,
          isPublic: certificate.isPublic,
          issuedBy: certificate.issuedBy,
          validFrom: certificate.validFrom,
          validTill: certificate.validTill,
          createdAt: certificate.createdAt,
        },
      });
    } catch (err) {
      console.error('Create certificate error:', err);
      return res.status(500).json({ message: 'Failed to upload certificate' });
    }
  }
);

router.patch(
  '/me/certificates/:certificateId',
  auth,
  requireRole('COMPANY_ADMIN'),
  validate(certUpdateSchema),
  async (req, res) => {
    try {
      const { certificateId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(certificateId)) {
        return res.status(400).json({ message: 'Invalid certificate id' });
      }

      const company = await Company.findById(req.user.companyId);
      if (!company) return res.status(404).json({ message: 'Company not found' });

      const cert = company.certificates.id(certificateId);
      if (!cert) return res.status(404).json({ message: 'Certificate not found' });

      Object.keys(req.body).forEach((key) => {
        cert[key] = req.body[key];
      });
      await company.save();

      return res.json({
        message: 'Certificate updated',
        certificate: {
          id: cert._id,
          title: cert.title,
          description: cert.description,
          fileUrl: cert.fileUrl,
          isPublic: cert.isPublic,
          issuedBy: cert.issuedBy,
          validFrom: cert.validFrom,
          validTill: cert.validTill,
          createdAt: cert.createdAt,
        },
      });
    } catch (err) {
      console.error('Update certificate error:', err);
      return res.status(500).json({ message: 'Failed to update certificate' });
    }
  }
);

router.delete('/me/certificates/:certificateId', auth, requireRole('COMPANY_ADMIN'), async (req, res) => {
  try {
    const { certificateId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(certificateId)) {
      return res.status(400).json({ message: 'Invalid certificate id' });
    }

    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const cert = company.certificates.id(certificateId);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    const publicId = cert.filePublicId;
    cert.deleteOne();
    await company.save();
    if (publicId) await deleteFile(publicId);

    return res.json({ message: 'Certificate deleted' });
  } catch (err) {
    console.error('Delete certificate error:', err);
    return res.status(500).json({ message: 'Failed to delete certificate' });
  }
});

module.exports = router;
