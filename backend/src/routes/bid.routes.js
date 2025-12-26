const express = require('express');
const Bid = require('../models/Bid');
const Tender = require('../models/Tender');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createBidSchema } = require('../validation/bidSchema');

const router = express.Router();

// POST /api/bids  (create draft bid)
router.post(
  '/',
  auth,
  requireRole('BIDDER', 'COMPANY_ADMIN'),
  validate(createBidSchema),
  async (req, res) => {
    try {
      const {
        tenderId,
        amount,
        deliveryDays,
        validTill,
        documents,
        notes,
      } = req.body;

      if (!tenderId || amount == null) {
        return res.status(400).json({ message: 'tenderId and amount are required' });
      }

      const tender = await Tender.findById(tenderId);
      if (!tender) {
        return res.status(404).json({ message: 'Tender not found' });
      }

      if (tender.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Can only bid on PUBLISHED tenders' });
      }

      // Optional: prevent owner company from bidding on its own tender
      if (tender.ownerCompany.toString() === req.user.companyId.toString()) {
        return res.status(400).json({ message: 'Owner company cannot bid on its own tender' });
      }

      const bid = await Bid.create({
        tender: tender._id,
        bidderCompany: req.user.companyId,
        submittedBy: req.user.id,
        amount,
        deliveryDays,
        validTill,
        documents,
        notes,
        status: 'DRAFT',
      });

      res.status(201).json(bid);
    } catch (err) {
      console.error('Create bid error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PATCH /api/bids/:id  (update draft bid)
router.patch(
  '/:id',
  auth,
  requireRole('BIDDER', 'COMPANY_ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        amount,
        deliveryDays,
        validTill,
        documents,
        notes,
      } = req.body;

      const bid = await Bid.findById(id).populate('tender');
      if (!bid) {
        return res.status(404).json({ message: 'Bid not found' });
      }

      // Must belong to same company
      if (bid.bidderCompany.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ message: 'Forbidden: not your company bid' });
      }

      // Only DRAFT bids can be edited
      if (bid.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Only DRAFT bids can be edited' });
      }

      // Tender must still be PUBLISHED
      if (!bid.tender || bid.tender.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Tender is not open for editing bids' });
      }

      if (amount != null) bid.amount = amount;
      if (deliveryDays != null) bid.deliveryDays = deliveryDays;
      if (validTill != null) bid.validTill = validTill;
      if (documents != null) bid.documents = documents;
      if (notes != null) bid.notes = notes;

      await bid.save();

      res.json(bid);
    } catch (err) {
      console.error('Update bid error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PATCH /api/bids/:id/submit
router.patch(
  '/:id/submit',
  auth,
  requireRole('BIDDER', 'COMPANY_ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const bid = await Bid.findById(id).populate('tender');
      if (!bid) {
        return res.status(404).json({ message: 'Bid not found' });
      }

      if (bid.bidderCompany.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ message: 'Forbidden: not your company bid' });
      }

      if (bid.status !== 'DRAFT') {
        return res.status(400).json({ message: 'Only DRAFT bids can be submitted' });
      }

      if (!bid.tender || bid.tender.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Tender is not accepting bids' });
      }

      bid.status = 'SUBMITTED';
      await bid.save();

      res.json(bid);
    } catch (err) {
      console.error('Submit bid error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
// PATCH /api/bids/:id/withdraw
router.patch(
  '/:id/withdraw',
  auth,
  requireRole('BIDDER', 'COMPANY_ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const bid = await Bid.findById(id).populate('tender');
      if (!bid) {
        return res.status(404).json({ message: 'Bid not found' });
      }

      if (bid.bidderCompany.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ message: 'Forbidden: not your company bid' });
      }

      if (bid.status !== 'SUBMITTED') {
        return res.status(400).json({ message: 'Only SUBMITTED bids can be withdrawn' });
      }

      if (!bid.tender || bid.tender.status !== 'PUBLISHED') {
        return res.status(400).json({ message: 'Cannot withdraw: tender not open' });
      }

      bid.status = 'WITHDRAWN';
      await bid.save();

      res.json(bid);
    } catch (err) {
      console.error('Withdraw bid error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
// GET /api/bids/my-company
router.get('/my-company', auth, async (req, res) => {
  try {
    const bids = await Bid.find({ bidderCompany: req.user.companyId })
      .populate('tender', 'title status')
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (err) {
    console.error('List my company bids error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/tenders/:tenderId/bids
router.get(
  '/tender/:tenderId',
  auth,
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'),
  async (req, res) => {
    try {
      const { tenderId } = req.params;

      const tender = await Tender.findById(tenderId);
      if (!tender) {
        return res.status(404).json({ message: 'Tender not found' });
      }

      if (req.user.role !== 'SUPER_ADMIN') {
        const isOwner =
          tender.ownerCompany.toString() === req.user.companyId.toString();
        if (!isOwner) {
          return res.status(403).json({ message: 'Forbidden: not your tender' });
        }
      }

      const bids = await Bid.find({ tender: tender._id })
        .populate('bidderCompany', 'name industry')
        .populate('submittedBy', 'name email')
        .sort({ createdAt: -1 });

      res.json(bids);
    } catch (err) {
      console.error('List tender bids error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);
module.exports = router;