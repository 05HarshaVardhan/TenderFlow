const express = require('express');
const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { uploadFields } = require('../middleware/upload');
const { submitBidSchema } = require('../validation/bidSchema');
const { generateBidPreSubmitReview } = require('../services/bidPreSubmitReviewService');

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
    const { status } = req.query;
    let query = {};

    if (req.user.role === 'COMPANY_ADMIN') {
      query = { bidderCompany: req.user.companyId };
    } else if (req.user.role === 'BIDDER') {
      query = {
        bidderCompany: req.user.companyId,
        submittedBy: req.user.id
      };
    } else if (req.user.role !== 'SUPER_ADMIN') {
      return res.json([]);
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    const bids = await Bid.find(query)
      .populate({
        path: 'tender',
        select: 'title status referenceNumber ownerCompany createdBy budget estimatedValue', 
        populate: [
          { path: 'ownerCompany', select: 'name logo' },
          { path: 'createdBy', select: 'name email' }
        ]
      })
      .populate('submittedBy', 'name email')
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

// POST /api/bids - Create DRAFT bid
router.post('/', auth, requireRole('BIDDER', 'COMPANY_ADMIN'),
  uploadFields([
    { name: 'technicalDocs', maxCount: 5 },
    { name: 'financialDocs', maxCount: 5 }, // Increased to 5
    { name: 'emdReceipt', maxCount: 1 }
  ]), async (req, res) => {
    // Helper function to format file data with safe access to req.files
    const getFileData = (field) => {
  if (!req.files) {
    console.log('No files were uploaded');
    return [];
  }
  
  // For multiple files
  if (Array.isArray(req.files[field])) {
    return req.files[field].map(file => ({
      url: file.path,
      public_id: file.filename,
      name: file.originalname
    }));
  }
  
  // For single file
  if (req.files[field]) {
    return [{
      url: req.files[field][0].path,
      public_id: req.files[field][0].filename,
      name: req.files[field][0].originalname
    }];
  }
  
  return [];
};
    
    try {
      const existingWithdrawal = await Bid.findOne({
        tender: req.body.tender,
        bidderCompany: req.user.companyId,
        status: 'WITHDRAWN'
      });
      if (existingWithdrawal) {
        return res.status(403).json({
          message: "Your company previously withdrew a bid for this tender and is no longer eligible to participate."
        });
      }
      const existingDraft = await Bid.findOne({
        tender: req.body.tenderId,
        bidderCompany: req.user.companyId,
        status: 'DRAFT'
      });

      if (existingDraft) {
        return res.status(400).json({
          message: 'A draft already exists for this tender. Please update the existing draft instead.',
          existingId: existingDraft._id
        });
      }

      const bid = await Bid.create({
        ...req.body,
        amount: Number(req.body.amount || 0),
        deliveryDays: Number(req.body.deliveryDays || 0),
        status: 'DRAFT',
        tender: req.body.tenderId,
        bidderCompany: req.user.companyId,
        submittedBy: req.user.id,
        technicalDocs: getFileData('technicalDocs'),
        financialDocs: getFileData('financialDocs'),
        emdPaymentProof: {
          transactionId: req.body.transactionId,
          paymentMode: req.body.paymentMode,
          receiptDoc: getFileData('emdReceipt')[0]
        }
      });
      await Tender.findByIdAndUpdate(req.body.tenderId, {
        $addToSet: { bids: bid._id }
      });
      console.log(bid)
      // In bid.routes.js, add at the beginning of the route handler:
console.log('Request body:', req.body);
console.log('Request files:', req.files);
console.log('Request headers:', req.headers['content-type']);
      res.status(201).json(bid);
    } catch (err) {
      console.error('Bid draft error:', err);
      res.status(500).json({ message: 'Bid draft failed', error: err.message });
    }
  });

// PATCH /api/bids/:id - Update DRAFT bid with Sync Logic
router.patch('/:id',
  auth,
  requireRole('BIDDER', 'COMPANY_ADMIN', 'SUPER_ADMIN'),
  uploadFields([
    { name: 'technicalDocs', maxCount: 5 },
    { name: 'financialDocs', maxCount: 5 }, // Increased to 5
    { name: 'emdReceipt', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const bid = await Bid.findOne(getBidQuery(req, req.params.id)).populate('tender');
      if (!bid) return res.status(404).json({ message: 'Bid not found' });

      if (bid.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Only DRAFT bids can be edited' });
      }

      if (bid.tender.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Tender is no longer open for editing' });
      }

      // 1. Update Basic Fields
      const allowed = ['amount', 'deliveryDays', 'notes'];
      allowed.forEach(field => {
        if (req.body[field] !== undefined) {
          bid[field] = (field === 'amount' || field === 'deliveryDays')
            ? Number(req.body[field])
            : req.body[field];
        }
      });

      // 2. Handle EMD Meta Data
      if (!bid.emdPaymentProof) bid.emdPaymentProof = {};
      if (req.body.transactionId) bid.emdPaymentProof.transactionId = req.body.transactionId;
      if (req.body.paymentMode) bid.emdPaymentProof.paymentMode = req.body.paymentMode;

      // 3. Helper to format new files
      const getFileData = (field) => req.files?.[field] ? req.files[field].map(f => ({
        url: f.path, public_id: f.filename, name: f.originalname
      })) : [];

      // 4. File Sync (Kept Files + Newly Uploaded Files)
      if (req.body.keepTechnicalDocs) {
        const kept = JSON.parse(req.body.keepTechnicalDocs);
        bid.technicalDocs = [...kept, ...getFileData('technicalDocs')];
      }

      if (req.body.keepFinancialDocs) {
        const kept = JSON.parse(req.body.keepFinancialDocs);
        bid.financialDocs = [...kept, ...getFileData('financialDocs')];
      }

      if (req.body.keepEmdReceipt) {
        const keptEmd = JSON.parse(req.body.keepEmdReceipt);
        const newEmd = getFileData('emdReceipt')[0];
        // Priority to new upload; if no new upload, keep the old one (if not deleted)
        bid.emdPaymentProof.receiptDoc = newEmd || keptEmd || null;
      }

      const saved = await bid.save();
      console.log("this is from patch bid")
      // In bid.routes.js, add at the beginning of the route handler:
console.log('Request body:', req.body);
console.log('Request files:', req.files);
console.log('Request headers:', req.headers['content-type']);
      res.json(saved);
    } catch (err) {
      console.error('Update error:', err);
      res.status(500).json({ message: 'Update failed', error: err.message });
    }
  });

// GET /api/bids/:id/pre-submit-review
router.get('/:id/pre-submit-review', auth, requireRole('BIDDER', 'COMPANY_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findOne(getBidQuery(req, req.params.id))
      .populate('tender', 'title category estimatedValue emdAmount status')
      .lean();

    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    if (bid.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Pre-submit review is available only for draft bids' });
    }

    if (!bid.tender || bid.tender.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Tender is no longer accepting bids' });
    }

    const review = await generateBidPreSubmitReview({
      bid,
      tender: bid.tender
    });

    return res.json({
      message: 'Pre-submit review generated',
      review
    });
  } catch (err) {
    console.error('Pre-submit review error:', err);
    return res.status(500).json({ message: 'Failed to generate pre-submit review', error: err.message });
  }
});

// PATCH /api/bids/:id/submit - STRICT VALIDATION
router.patch('/:id/submit', auth, requireRole('BIDDER', 'COMPANY_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findOne({
      _id: req.params.id,
      bidderCompany: req.user.companyId,
      status: 'DRAFT'
    }).populate('tender');

    if (!bid) return res.status(404).json({ message: 'Draft bid not found' });
    if (bid.tender.status !== 'PUBLISHED') return res.status(400).json({ message: 'Tender is no longer accepting bids' });

    // STRICT VALIDATION
    const { error } = submitBidSchema.validate(bid.toObject(), { allowUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed - please complete all required fields',
        errors: error.details.map(d => ({ field: d.path[0], message: d.message }))
      });
    }

    if (!bid.technicalDocs || bid.technicalDocs.length === 0) {
      return res.status(400).json({ message: 'Technical envelope is required' });
    }

    if (!bid.financialDocs || bid.financialDocs.length === 0) {
      return res.status(400).json({ message: 'Financial envelope is required' });
    }

    if (!bid.emdPaymentProof?.receiptDoc?.url) {
      return res.status(400).json({ message: 'EMD receipt is required' });
    }

    // Anomaly detection
    const lowerLimit = bid.tender.estimatedValue * 0.7;
    if (bid.amount < lowerLimit) {
      bid.anomalyScore = 85;
      bid.aiNotes = "Alert: Bid significantly below estimated value";
    }

    bid.status = 'SUBMITTED';
    bid.submittedAt = new Date();
    await bid.save();
    await Tender.findByIdAndUpdate(bid.tender._id, {
      $addToSet: { bids: bid._id }
    });
    // In bid.routes.js, add at the beginning of the route handler:
    console.log("this is from pathc bid/submit")
console.log('Request body:', req.body);
console.log('Request files:', req.files);
console.log('Request headers:', req.headers['content-type']);
    res.json({ message: 'Bid submitted successfully!', bid });
  } catch (err) {
    res.status(500).json({ message: 'Submission error', error: err.message });
  }
});

// PATCH /api/bids/:id/award
router.patch('/:id/award', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('tender');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const tender = bid.tender;
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const isCompanyAdmin = req.user.role === 'COMPANY_ADMIN' && tender.ownerCompany.toString() === req.user.companyId.toString();
    const isTenderPoster = req.user.role === 'TENDER_POSTER' && tender.createdBy.toString() === req.user.id.toString();

    if (!isSuperAdmin && !isCompanyAdmin && !isTenderPoster) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (tender.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Tender is not in a state to be awarded.' });
    }

    bid.status = 'ACCEPTED';
    await bid.save();

    await Tender.findByIdAndUpdate(tender._id, { status: 'AWARDED' });

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
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const isCompanyAdmin = req.user.role === 'COMPANY_ADMIN' && tender.ownerCompany.toString() === req.user.companyId.toString();
    const isTenderPoster = req.user.role === 'TENDER_POSTER' && tender.createdBy.toString() === req.user.id.toString();

    if (!isSuperAdmin && !isCompanyAdmin && !isTenderPoster) {
      return res.status(403).json({ message: 'Unauthorized' });
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

// --- WITHDRAW BID ---
router.patch('/:id/withdraw', auth, async (req, res) => {
  try {
    // 1. Find the bid and ensure it belongs to the user's company
    const bid = await Bid.findOne({
      _id: req.params.id,
      bidderCompany: req.user.companyId,
      status: { $ne: 'WITHDRAWN' } // Cannot withdraw an already withdrawn bid
    });

    if (!bid) {
      return res.status(404).json({ message: "Bid not found or already withdrawn" });
    }

    // 2. Update status to WITHDRAWN
    bid.status = 'WITHDRAWN';
    bid.withdrawnAt = new Date();
    bid.withdrawnBy = req.user.id;
    await bid.save();

    res.json({ message: "Bid withdrawn. Your company is now ineligible for this tender.", bid });
  } catch (err) {
    res.status(500).json({ message: "Withdrawal failed", error: err.message });
  }
});

module.exports = router;
