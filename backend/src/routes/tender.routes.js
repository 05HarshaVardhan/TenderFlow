const cloudinary = require('cloudinary').v2;
const express = require('express');
const Tender = require('../models/Tender');
const Bid = require('../models/Bid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { publishTenderSchema } = require('../validation/tenderSchema');
const { uploadMultiple } = require('../middleware/upload');
const router = express.Router();

// Helper to enforce ownership
const getTenderQuery = (req, tenderId) => {
  let query = { _id: tenderId };

  if (req.user.role === 'SUPER_ADMIN') return query;

  // Always restrict by company
  query.ownerCompany = req.user.companyId;

  // If the user is only a Poster, restrict to their own drafts
  if (req.user.role === 'TENDER_POSTER') {
    query.createdBy = req.user.id;
  }

  return query;
};

// --- CREATE TENDER (DRAFT) ---
router.post('/', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER'), uploadMultiple('documents', 10), async (req, res) => {
  try {
    const documentData = req.files ? req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
      name: file.originalname,
      fileType: file.mimetype
    })) : [];

    const tender = await Tender.create({
      ...req.body,
      status: 'DRAFT',
      estimatedValue: Number(req.body.estimatedValue || 0),
      emdAmount: Number(req.body.emdAmount || 0),
      documents: documentData,
      ownerCompany: req.user.companyId,
      createdBy: req.user.id
    });

    res.status(201).json(tender);
  } catch (err) {
    console.error('Draft creation error:', err);
    res.status(500).json({ message: 'Draft creation failed', error: err.message });
  }
});

// --- UPDATE TENDER (DRAFT ONLY) ---
// This handles both text data and new file uploads for editing
// In the PATCH /:id route, replace the existing document handling code with this:

router.patch('/:id', 
  auth, 
  requireRole('COMPANY_ADMIN', 'TENDER_POSTER', 'SUPER_ADMIN'),
  uploadMultiple('documents', 10),
  async (req, res) => {
    try {
      const tender = await Tender.findOne(getTenderQuery(req, req.params.id));
      if (!tender) return res.status(404).json({ message: 'Tender not found' });

      // === ADD THE DEBUG LOGS HERE ===
      console.log('=== REQUEST BODY ===');
      console.log('req.body:', req.body);
      console.log('req.files:', req.files ? req.files.map(f => f.originalname) : 'No files');
      console.log('existingDocuments type:', typeof req.body.existingDocuments);
      console.log('existingDocuments value:', req.body.existingDocuments);

      // 1. Handle document updates and new uploads
      if (req.files && req.files.length > 0) {
          console.log('Processing new file uploads...');
          const newDocs = req.files.map(file => {
              const doc = {
                  url: file.path,
                  public_id: file.filename,
                  name: file.originalname,
                  fileType: file.mimetype
              };
              console.log('New document:', doc);
              return doc;
          });
          
          // Handle existing documents
          let existingDocs = [];
          if (req.body.existingDocuments) {
              try {
                  console.log('Parsing existing documents...');
                  existingDocs = JSON.parse(req.body.existingDocuments);
                  console.log('Parsed existing documents:', existingDocs);
                  
                  if (!Array.isArray(existingDocs)) {
                      console.error('existingDocuments is not an array:', existingDocs);
                      return res.status(400).json({ 
                          message: 'existingDocuments must be an array',
                          received: typeof existingDocs
                      });
                  }
              } catch (err) {
                  console.error('Error parsing existing documents:', err);
                  return res.status(400).json({ 
                      message: 'Invalid existingDocuments format',
                      error: err.message
                  });
              }
          }
          
          console.log('Merging documents. Existing:', existingDocs.length, 'New:', newDocs.length);
          tender.documents = [...existingDocs, ...newDocs];
      } else if (req.body.existingDocuments) {
          console.log('Updating existing documents only...');
          try {
              const existingDocs = JSON.parse(req.body.existingDocuments);
              console.log('Parsed existing documents:', existingDocs);
              
              if (!Array.isArray(existingDocs)) {
                  console.error('existingDocuments is not an array:', existingDocs);
                  return res.status(400).json({ 
                      message: 'existingDocuments must be an array',
                      received: typeof existingDocs
                  });
              }
              
              console.log('Setting documents to:', existingDocs);
              tender.documents = existingDocs;
          } catch (err) {
              console.error('Error parsing existing documents:', err);
              return res.status(400).json({ 
                  message: 'Invalid documents format',
                  error: err.message
              });
          }
      } else {
          console.log('No document updates in this request');
      }

      // 2. Update text fields
      const allowed = ['title', 'description', 'estimatedValue', 'emdAmount', 'endDate', 'category'];
      allowed.forEach(key => {
          if (req.body[key] !== undefined) {
              tender[key] = (key === 'estimatedValue' || key === 'emdAmount') 
                  ? Number(req.body[key]) 
                  : req.body[key];
          }
      });

      // 3. Handle tags
      if (req.body.tags) {
          tender.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      }

      const saved = await tender.save();
      console.log('Tender saved successfully:', saved);
      res.json(saved);
    } catch (err) {
      console.error('Update error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
});
// --- PUBLISH TENDER ---
router.patch('/:id/publish', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER'), async (req, res) => {
  try {
    const tender = await Tender.findOne({
      _id: req.params.id,
      ownerCompany: req.user.companyId,
      status: 'DRAFT'
    });

    if (!tender) return res.status(404).json({ message: 'Draft tender not found or already published' });

    // 1. UPDATE DOCUMENTS LIST IF PROVIDED
    // This captures the files you kept in the confirmation dialog
    if (req.body.existingDocuments) {
      try {
        tender.documents = JSON.parse(req.body.existingDocuments);
      } catch {
        return res.status(400).json({ message: "Invalid existingDocuments JSON" });
      }
    }


    // 2. Logic Check: Documents are required for publishing
    if (!tender.documents || tender.documents.length === 0) {
      return res.status(400).json({ message: 'At least one document is required to publish' });
    }

    // 3. Validate with Joi (Strict Check)
    const { error } = publishTenderSchema.validate(tender.toObject(), { allowUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed - complete all fields before publishing',
        details: error.details.map(d => d.message)
      });
    }

    // 4. Finalize Publication
    tender.status = 'PUBLISHED';
    tender.startDate = new Date();
    await tender.save();

    res.json({ message: 'Tender is now LIVE', tender });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ message: 'Publishing failed', error: err.message });
  }
});
// --- DATA FETCHING ROUTES ---

// --- backend/routes/tenderRoutes.js ---

// --- backend/routes/tenderRoutes.js ---

// CHANGE THIS LINE to match your frontend error: /my-posted-tenders
// --- backend/routes/tenderRoutes.js ---

router.get(['/my-company', '/my-posted-tenders'], auth, async (req, res) => {
  try {
    const { search, category, sortBy, statusFilter } = req.query;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    let andConditions = [];

    // A. Role-Based Privacy Logic
    if (req.user.role === 'SUPER_ADMIN') {
      // Super Admin sees everything - no base condition
    } else if (req.user.role === 'TENDER_POSTER') {
      // Poster: ONLY their own stuff within their company
      andConditions.push({ ownerCompany: companyId });
      andConditions.push({ createdBy: userId });
    } else {
      // Admin/Staff: Everything in company EXCEPT other people's drafts
      andConditions.push({ ownerCompany: companyId });
      andConditions.push({
        $or: [
          { status: { $ne: 'DRAFT' } },
          { createdBy: userId }
        ]
      });
    }

    // B. Filters
    if (category && category !== 'All') andConditions.push({ category });
    if (statusFilter && statusFilter !== 'All') andConditions.push({ status: statusFilter });

    // C. Search
    if (search && search.trim() !== "") {
      const searchRegex = { $regex: search, $options: 'i' };
      andConditions.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      });
    }

    const finalQuery = andConditions.length > 0 ? { $and: andConditions } : {};

    // D. Sorting
    let sortOption = { createdAt: -1 };
    if (sortBy === 'oldest') sortOption = { createdAt: 1 };
    if (sortBy === 'value_high') sortOption = { estimatedValue: -1 };
    if (sortBy === 'value_low') sortOption = { estimatedValue: 1 };
    if (sortBy === 'deadline') sortOption = { endDate: 1 };

    const tenders = await Tender.find(finalQuery)
      .populate({ path: 'bids', match: { status: 'SUBMITTED' } })
      .sort(sortOption)
      .lean();

    res.json(tenders);
  } catch (err) {
    console.error('TENDER FETCH ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.get('/available', auth, async (req, res) => {
  try {
    // Logic: 
    // 1. Status must be PUBLISHED
    // 2. ownerCompany must NOT be the user's current companyId
    const query = {
      status: 'PUBLISHED',
      ownerCompany: { $ne: req.user.companyId }
    };

    const tenders = await Tender.find(query)
      .populate('ownerCompany', 'name industry')
      .sort({ createdAt: -1 })
      .lean();

    res.json(tenders);
  } catch (err) {
    console.error('Fetch available tenders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id)
      .populate('ownerCompany', 'name industry')
      .populate('createdBy', 'name')
      .populate({
        path: 'bids',
        populate: { path: 'bidderCompany', select: 'name industry' }
      }).lean();

    if (!tender) return res.status(404).json({ message: 'Tender not found' });

    // Filter bids visibility based on role
    if (req.user.role === 'BIDDER') {
      tender.bids = tender.bids.filter(bid =>
        bid.bidderCompany?._id.toString() === req.user.companyId.toString()
      );
    }
    res.json(tender);
  } catch (err) { res.status(500).json({ message: 'Fetch error' }); }
});

// --- STATUS MANAGEMENT ---

router.patch('/:id/close', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER'), async (req, res) => {
  try {
    const updated = await Tender.findOneAndUpdate(
      { ...getTenderQuery(req, req.params.id), status: 'PUBLISHED' },
      { $set: { status: 'CLOSED' } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Active tender not found' });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: 'Close error' }); }
});

router.patch('/:id/award', auth, requireRole('COMPANY_ADMIN', 'TENDER_POSTER'), async (req, res) => {
  try {
    const { winningBidId } = req.body;
    if (!winningBidId) return res.status(400).json({ message: 'Winning Bid ID is required' });

    const tender = await Tender.findOneAndUpdate(
      { ...getTenderQuery(req, req.params.id), status: 'CLOSED' },
      { $set: { status: 'AWARDED' } },
      { new: true }
    );

    if (!tender) return res.status(404).json({ message: 'Closed tender not found' });

    await Bid.findByIdAndUpdate(winningBidId, { status: 'ACCEPTED' });
    await Bid.updateMany(
      { tender: tender._id, _id: { $ne: winningBidId }, status: 'SUBMITTED' },
      { $set: { status: 'REJECTED' } }
    );

    res.json({ message: 'Tender awarded successfully', tender });
  } catch (err) { res.status(500).json({ message: 'Award error' }); }
});

// Add this temporarily to tenderRoutes.js
router.get('/admin/sync-bids', auth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const bids = await Bid.find({});
    const updates = bids.map(bid =>
      Tender.findByIdAndUpdate(bid.tender, {
        $addToSet: { bids: bid._id }
      })
    );
    await Promise.all(updates);
    res.json({ message: `Synced ${bids.length} bids to their respective tenders.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;