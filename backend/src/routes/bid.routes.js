const express = require('express');
const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createBidSchema } = require('../validation/bidSchema');

const router = express.Router();

/**
 * Helper to get a bid scoped by permissions
 */
const getBidQuery = (req, bidId) => {
  const query = { _id: bidId };
  if (req.user.role !== 'SUPER_ADMIN') {
    query.bidderCompany = req.user.companyId;
  }
  return query;
};

// GET /api/bids/my-company - For Bidder and Company Admin Dashboard
router.get('/my-company', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'COMPANY_ADMIN') {
      // For COMPANY_ADMIN, show all bids from their company
      query = { bidderCompany: req.user.companyId };
    } else if (req.user.role === 'BIDDER') {
      // For BIDDER, show only their own bids
      query = { 
        bidderCompany: req.user.companyId,
        submittedBy: req.user.id 
      };
    } else if (req.user.role !== 'SUPER_ADMIN') {
      // For other roles, return empty array (or 403 if preferred)
      return res.json([]);
    }

    const bids = await Bid.find(query)
      .populate({
        path: 'tender',
        select: 'title status referenceNumber ownerCompany createdBy',
        populate: [
          { path: 'ownerCompany', select: 'name logo' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .populate('submittedBy', 'name email') // Add this to show who submitted the bid
      .sort({ createdAt: -1 })
      .lean();

    res.json(bids);
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ message: 'Error fetching bids' });
  }
});

// GET /api/bids/my-personal-bids
router.get('/my-personal-bids', auth, async (req, res) => {
  try {
    const bids = await Bid.find({ submittedBy: req.user.id })
      .populate({
        path: 'tender',
        select: 'title category ownerCompany createdBy',
        populate: [
          { path: 'ownerCompany', select: 'name' },
          { path: 'createdBy', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json(bids);
  } catch (err) {
    console.error('Fetch personal bids error:', err);
    res.status(500).json({ message: 'Server error fetching your bids' });
  }
});

// GET /api/bids/received-on-my-tenders
router.get('/received-on-my-tenders', auth, async (req, res) => {
  try {
    const myTenders = await Tender.find({ createdBy: req.user.id }).select('_id');
    const tenderIds = myTenders.map(t => t._id);

    const bids = await Bid.find({ tender: { $in: tenderIds } })
      .populate('bidderCompany', 'name industry')
      .populate('submittedBy', 'name email')
      .populate({
        path: 'tender',
        select: 'title ownerCompany createdBy',
        populate: [
          { path: 'ownerCompany', select: 'name' },
          { path: 'createdBy', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(bids || []);
  } catch (err) {
    console.error('Bids Fetch Error:', err);
    res.status(500).json({ message: 'Error fetching received bids', error: err.message });
  }
});

// GET /api/bids/tender/:tenderId
router.get('/tender/:tenderId', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const tenderQuery = { _id: req.params.tenderId };
    if (req.user.role !== 'SUPER_ADMIN') tenderQuery.ownerCompany = req.user.companyId;

    const tender = await Tender.findOne(tenderQuery).lean();
    if (!tender) return res.status(404).json({ message: 'Tender not found or unauthorized' });

    const bids = await Bid.find({ 
      tender: tender._id,
      status: { $ne: 'DRAFT' } 
    })
      .populate('bidderCompany', 'name industry')
      .populate('submittedBy', 'name email')
      .sort({ amount: 1 })
      .lean();

    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tender bids' });
  }
});

// POST /api/bids - Create draft or submitted bid
router.post('/', auth, requireRole('BIDDER', 'COMPANY_ADMIN'), validate(createBidSchema), async (req, res) => {
  try {
    const { tenderId, status = 'DRAFT' } = req.body;

    const tender = await Tender.findById(tenderId);
    if (!tender) return res.status(404).json({ message: 'Tender not found' });
    if (tender.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Can only bid on PUBLISHED tenders' });
    }

    if (tender.ownerCompany.toString() === req.user.companyId.toString()) {
      return res.status(400).json({ message: 'Owner company cannot bid on its own tender' });
    }

    const existingAny = await Bid.findOne({ tender: tenderId, bidderCompany: req.user.companyId }).lean();
    if (existingAny) {
      return res.status(400).json({ message: 'A bid already exists. Please edit your existing bid.' });
    }

    const bid = await Bid.create({
      ...req.body,
      tender: tenderId,
      bidderCompany: req.user.companyId,
      submittedBy: req.user.id,
      status: req.body.status || 'DRAFT', 
      submittedAt: req.body.status === 'SUBMITTED' ? new Date() : null
    });

    await Tender.findByIdAndUpdate(tenderId, {
      $push: { bids: bid._id }
    });

    res.status(201).json(bid.toObject());
  } catch (err) {
    console.error('Create bid error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/bids/:id - Update details
router.patch('/:id', auth, requireRole('BIDDER', 'COMPANY_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findOne(getBidQuery(req, req.params.id)).populate('tender');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    if (bid.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT bids can be edited' });
    if (bid.tender.status !== 'PUBLISHED') return res.status(400).json({ message: 'Tender is no longer open' });

    const allowed = ['amount', 'deliveryDays', 'validTill', 'documents', 'notes', 'status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) bid[field] = req.body[field];
    });

    if (req.body.status === 'SUBMITTED') {
      bid.submittedAt = new Date();
    }

    const saved = await bid.save();
    res.json(saved.toObject());
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// PATCH /api/bids/:id/submit
router.patch('/:id/submit', auth, requireRole('BIDDER', 'COMPANY_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const query = { ...getBidQuery(req, req.params.id), status: 'DRAFT' };
    
    const bid = await Bid.findOneAndUpdate(
      query,
      { $set: { status: 'SUBMITTED', submittedAt: new Date() } },
      { new: true }
    ).populate('tender').lean();

    if (!bid) return res.status(404).json({ message: 'Draft bid not found' });
    if (bid.tender.status !== 'PUBLISHED') return res.status(400).json({ message: 'Tender is closed' });

    res.json(bid);
  } catch (err) {
    res.status(500).json({ message: 'Submission failed' });
  }
});

// PATCH /api/bids/:id/award
router.patch('/:id/award', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('tender');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const tender = bid.tender;

    // AUTHORIZATION LOGIC:
    // 1. Super Admin can always award
    // 2. Company Admin can award if they belong to the owner company
    // 3. Tender Poster can award if they are the 'createdBy' user of that tender
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const isCompanyAdmin = req.user.role === 'COMPANY_ADMIN' && tender.ownerCompany.toString() === req.user.companyId.toString();
    const isTenderPoster = req.user.role === 'TENDER_POSTER' && tender.createdBy.toString() === req.user.id.toString();

    if (!isSuperAdmin && !isCompanyAdmin && !isTenderPoster) {
      return res.status(403).json({ message: 'Unauthorized: Only the tender creator or company admin can award this.' });
    }

    if (tender.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Tender is not in a state to be awarded.' });
    }

    // Update the winning bid
    bid.status = 'ACCEPTED';
    await bid.save();

    // Mark tender as awarded
    await Tender.findByIdAndUpdate(tender._id, { status: 'AWARDED' });

    // Reject all other bids for this specific tender
    await Bid.updateMany(
      { tender: tender._id, _id: { $ne: bid._id }, status: 'SUBMITTED' },
      { status: 'REJECTED' }
    );

    res.json({ message: 'Tender awarded successfully!', winningBid: bid });
  } catch (err) {
    res.status(500).json({ message: 'Awarding error', error: err.message });
  }
});

// PATCH /api/bids/:id/reject
router.patch('/:id/reject', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('tender');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const tender = bid.tender;

    // Reuse the same authorization logic
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const isCompanyAdmin = req.user.role === 'COMPANY_ADMIN' && tender.ownerCompany.toString() === req.user.companyId.toString();
    const isTenderPoster = req.user.role === 'TENDER_POSTER' && tender.createdBy.toString() === req.user.id.toString();

    if (!isSuperAdmin && !isCompanyAdmin && !isTenderPoster) {
      return res.status(403).json({ message: 'Unauthorized to reject bids for this tender.' });
    }

    bid.status = 'REJECTED';
    await bid.save();

    res.json({ message: 'Bid rejected successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Rejection error' });
  }
});

// DELETE /api/bids/:id
router.delete('/:id', auth, requireRole('BIDDER', 'COMPANY_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findOne(getBidQuery(req, req.params.id)).populate('tender');
    if (!bid) return res.status(404).json({ message: 'Bid not found or unauthorized' });

    if (bid.tender.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Cannot withdraw bid: Tender is no longer open' });
    }

    await Tender.findByIdAndUpdate(bid.tender._id, {
      $pull: { bids: bid._id }
    });

    await Bid.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bid withdrawn successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Withdrawal failed' });
  }
});

module.exports = router;