const express = require('express');
const Tender = require('../models/Tender');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createTenderSchema } = require('../validation/tenderSchema');
const Bid = require('../models/Bid');

const router = express.Router();




async function loadTenderForUpdate(req, res) {
  const { id } = req.params;

  const tender = await Tender.findById(id);

  if (!tender) {
    res.status(404).json({ message: 'Tender not found' });
    return null;
  }

  // SUPER_ADMIN can manage any tender
  if (req.user.role !== 'SUPER_ADMIN') {
    const isOwner =
      tender.ownerCompany.toString() === req.user.companyId.toString();

    if (!isOwner) {
      res.status(403).json({ message: 'Forbidden: not your company tender' });
      return null;
    }
  }

  return tender;
}


// POST /api/tenders  (Create tender)
router.post(
  '/',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER'),
  validate(createTenderSchema),
  async (req, res) => {
    try {
      const {
        title,
        description,
        budgetMin,
        budgetMax,
        emdAmount,
        startDate,
        endDate,
        category,
        tags,
        documents,
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }

      const tender = await Tender.create({
        title,
        description,
        ownerCompany: req.user.companyId,
        createdBy: req.user.id,
        budgetMin,
        budgetMax,
        emdAmount,
        startDate,
        endDate,
        category,
        tags,
        documents,
        // status defaults to DRAFT
      });

      res.status(201).json(tender);
    } catch (err) {
      console.error('Create tender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PATCH /api/tenders/:id/publish
router.patch(
  '/:id/publish',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const tender = await loadTenderForUpdate(req, res);
      if (!tender) return;

      if (tender.status !== 'DRAFT') {
        return res
          .status(400)
          .json({ message: 'Only DRAFT tenders can be published' });
      }

      tender.status = 'PUBLISHED';
      tender.startDate = tender.startDate || new Date(); // if not already set
      await tender.save();

      res.json(tender);
    } catch (err) {
      console.error('Publish tender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
// PATCH /api/tenders/:id/close
router.patch(
  '/:id/close',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const tender = await loadTenderForUpdate(req, res);
      if (!tender) return;

      if (tender.status !== 'PUBLISHED') {
        return res
          .status(400)
          .json({ message: 'Only PUBLISHED tenders can be closed' });
      }

      tender.status = 'CLOSED';
      tender.endDate = tender.endDate || new Date(); // if not already set
      await tender.save();

      res.json(tender);
    } catch (err) {
      console.error('Close tender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PATCH /api/tenders/:id/award
router.patch(
  '/:id/award',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const { winningBidId } = req.body;

      if (!winningBidId) {
        return res
          .status(400)
          .json({ message: 'winningBidId is required' });
      }

      const tender = await loadTenderForUpdate(req, res);
      if (!tender) return;

      if (tender.status !== 'CLOSED') {
        return res
          .status(400)
          .json({ message: 'Only CLOSED tenders can be awarded' });
      }

      // Ensure winning bid belongs to this tender
      const winningBid = await Bid.findOne({
        _id: winningBidId,
        tender: tender._id,
      });

      if (!winningBid) {
        return res
          .status(400)
          .json({ message: 'Winning bid not found for this tender' });
      }

      // Update tender status
      tender.status = 'AWARDED';
      await tender.save();

      // Mark winning bid as ACCEPTED
      winningBid.status = 'ACCEPTED';
      await winningBid.save();

      // Mark all other bids as REJECTED
      await Bid.updateMany(
        {
          tender: tender._id,
          _id: { $ne: winningBidId },
          status: { $in: ['PENDING'] }, // only touch pending
        },
        { $set: { status: 'REJECTED' } }
      );

      res.json({
        tender,
        winningBid,
      });
    } catch (err) {
      console.error('Award tender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);



// GET /api/tenders/my-company
router.get('/my-company', auth, async (req, res) => {
  try {
    const query = { ownerCompany: req.user.companyId };

    const tenders = await Tender.find(query)
      .sort({ createdAt: -1 });

    res.json(tenders);
  } catch (err) {
    console.error('List company tenders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tenders/available
router.get('/available', auth, requireRole('BIDDER', 'COMPANY_ADMIN', 'TENDER_POSTER'), async (req, res) => {
  try {
    const tenders = await Tender.find({ status: 'PUBLISHED' })
      .sort({ createdAt: -1 });

    res.json(tenders);
  } catch (err) {
    console.error('List available tenders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tenders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const tender = await Tender.findById(id)
      .populate('ownerCompany', 'name industry')
      .populate('createdBy', 'name email role');

    if (!tender) {
      return res.status(404).json({ message: 'Tender not found' });
    }

    // Access control:
    // - SUPER_ADMIN: can view any tender
    // - Otherwise:
    //   - If user is from ownerCompany: allow (internal view)
    //   - If tender is PUBLISHED: allow (public view for bidders)
    if (req.user.role !== 'SUPER_ADMIN') {
      const isSameCompany =
        tender.ownerCompany &&
        tender.ownerCompany._id.toString() === req.user.companyId.toString();

      const isPublished = tender.status === 'PUBLISHED';

      if (!isSameCompany && !isPublished) {
        return res.status(403).json({ message: 'Forbidden: tender not accessible' });
      }
    }

    res.json(tender);
  } catch (err) {
    console.error('Get tender error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this route before the module.exports line in tender.routes.js

// PATCH /api/tenders/:id
router.patch(
  '/:id',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const tender = await loadTenderForUpdate(req, res);
      if (!tender) return;

      // Only allow updates to DRAFT tenders
      if (tender.status !== 'DRAFT') {
        return res.status(400).json({ 
          message: 'Only DRAFT tenders can be updated' 
        });
      }

      // List of allowed fields that can be updated
      const allowedUpdates = [
        'title',
        'description',
        'budgetMin',
        'budgetMax',
        'emdAmount',
        'startDate',
        'endDate',
        'category',
        'tags',
        'documents'
      ];

      // Update only the fields that are provided in the request body
      Object.keys(req.body).forEach(update => {
        if (allowedUpdates.includes(update)) {
          tender[update] = req.body[update];
        }
      });

      // Special handling for tags (if provided as comma-separated string)
      if (req.body.tags && typeof req.body.tags === 'string') {
        tender.tags = req.body.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }

      const updatedTender = await tender.save();
      res.json(updatedTender);
    } catch (err) {
      console.error('Update tender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;