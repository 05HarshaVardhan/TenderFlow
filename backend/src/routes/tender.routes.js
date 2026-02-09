const express = require('express');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createTenderSchema } = require('../validation/tenderSchema');

const router = express.Router();

/**
 * Helper to get a tender scoped by permissions
 */
const getTenderQuery = (req, tenderId) => {
  const query = { _id: tenderId };
  // SUPER_ADMIN can bypass company check
  if (req.user.role !== 'SUPER_ADMIN') {
    query.ownerCompany = req.user.companyId;
  }
  return query;
};

// POST /api/tenders - Create tender
router.post(
  '/',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER'),
  validate(createTenderSchema),
  async (req, res) => {
    try {
      const tender = await Tender.create({
        ...req.body,
        ownerCompany: req.user.companyId,
        createdBy: req.user.id,
      });

      res.status(201).json(tender.toObject());
    } catch (err) {
      console.error('Create tender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/tenders/my-company - For Dashboard
router.get('/my-company', auth, async (req, res) => {
  const query = req.user.role === 'SUPER_ADMIN' ? {} : { ownerCompany: req.user.companyId };
  
  const tenders = await Tender.find(query).populate({
    path: 'bids',
    match: { status: 'SUBMITTED' } // <--- Only populate submitted bids for the count
  }).lean();

  res.json(tenders);
});

// GET /api/tenders/available - For Bidders
router.get('/available', auth, async (req, res) => {
  try {
    const tenders = await Tender.find({ status: 'PUBLISHED' })
      .populate('ownerCompany', 'name industry')
      .sort({ createdAt: -1 })
      .lean();

    res.json(tenders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tenders/my-posted-tenders - Get tenders posted by the current user
router.get('/my-posted-tenders', auth, requireRole('TENDER_POSTER'), async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    // Only show tenders created by the current user
    const query = { createdBy: req.user.id };

    const tenders = await Tender.find(query)
      .populate('ownerCompany', 'name')
      .populate('createdBy', 'name')
      .populate('bids') 
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(tenders || []);
    console.log(tenders);
  } catch (err) {
    console.error('BACKEND ERROR IN MY-POSTED-TENDERS:', err); 
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});
// PATCH /api/tenders/:id/close
router.patch('/:id/close', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const updatedTender = await Tender.findOneAndUpdate(
      { ...getTenderQuery(req, req.params.id), status: 'PUBLISHED' },
      { $set: { status: 'CLOSED' } },
      { new: true }
    ).lean();

    if (!updatedTender) return res.status(404).json({ message: 'Active tender not found' });
    res.json(updatedTender);
  } catch (err) {
    res.status(500).json({ message: 'Close error' });
  }
});
// PATCH /api/tenders/:id/publish
router.patch('/:id/publish', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const updatedTender = await Tender.findOneAndUpdate(
      { ...getTenderQuery(req, req.params.id), status: 'DRAFT' },
      { $set: { status: 'PUBLISHED', startDate: new Date() } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedTender) return res.status(404).json({ message: 'Draft tender not found or unauthorized' });
    res.json(updatedTender);
  } catch (err) {
    res.status(500).json({ message: 'Publish error' });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    // 1. Fetch the tender with company and creator details
    const tender = await Tender.findById(req.params.id)
      .populate('ownerCompany', 'name industry')
      .populate('createdBy', 'name')
      .populate({
        path: 'bids',
        // Populate the bidder's company info so the poster knows who bid
        populate: { path: 'bidderCompany', select: 'name industry' } 
      })
      .lean();

    if (!tender) {
      return res.status(404).json({ message: 'Tender not found' });
    }

    // 2. Access Control Logic
    // If the user is a BIDDER, they shouldn't see everyone else's bids.
    if (req.user.role === 'BIDDER') {
      // Filter bids so a bidder only sees their OWN bid on this tender
      tender.bids = tender.bids.filter(
        bid => bid.bidderCompany?._id.toString() === req.user.companyId.toString()
      );
    } 
    // If it's the POSTER or ADMIN of the company that owns the tender, they see ALL bids.
    else if (req.user.companyId.toString() !== tender.ownerCompany._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      // Optional: Prevent users from other companies from snooping on tender details
      return res.status(403).json({ message: 'Unauthorized access to tender details' });
    }

    res.json(tender);
  } catch (err) {
    console.error('Fetch tender error:', err);
    res.status(500).json({ message: 'Server error fetching tender details' });
  }
});
// PATCH /api/tenders/:id/award
router.patch('/:id/award', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { winningBidId } = req.body;
    if (!winningBidId) return res.status(400).json({ message: 'winningBidId required' });

    const tender = await Tender.findOneAndUpdate(
      { ...getTenderQuery(req, req.params.id), status: 'CLOSED' },
      { $set: { status: 'AWARDED' } },
      { new: true }
    ).lean();

    if (!tender) return res.status(404).json({ message: 'Closed tender not found' });

    // 2. Accept Winning Bid
    await Bid.findByIdAndUpdate(winningBidId, { status: 'ACCEPTED' });

    // 3. Reject Others (Updated to target 'SUBMITTED' bids)
    await Bid.updateMany(
      { 
        tender: tender._id, 
        _id: { $ne: winningBidId }, 
        status: { $in: ['SUBMITTED', 'DRAFT'] } // Catch all other active bids
      },
      { $set: { status: 'REJECTED' } }
    );

    res.json({ message: 'Tender awarded successfully', tender });
  } catch (err) {
    res.status(500).json({ message: 'Award error' });
  }
});

// PATCH /api/tenders/:id - Generic Update
router.patch('/:id', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const tender = await Tender.findOne(getTenderQuery(req, req.params.id));
    
    if (!tender) return res.status(404).json({ message: 'Tender not found' });
    if (tender.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT can be updated' });

    const allowed = ['title', 'description', 'budgetMin', 'budgetMax', 'endDate', 'category'];
    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) tender[key] = req.body[key];
    });

    if (req.body.tags && typeof req.body.tags === 'string') {
      tender.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    const saved = await tender.save();
    res.json(saved.toObject());
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;