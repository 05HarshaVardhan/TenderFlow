const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  // --- References ---
  tender: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', required: true },
  bidderCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // --- Commercial/Financial Details ---
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  deliveryDays: { type: Number, required: true, min: 1 },
  validTill: { type: Date }, // How long this bid is legally binding

  // --- EMD / Bid Security Verification ---
  emdPaymentProof: {
    transactionId: { type: String },
    paymentMode: { type: String, enum: ['ONLINE', 'DD', 'BG', 'NA'] },
    receiptDoc: {
      url: { type: String },
      public_id: { type: String },
      name: { type: String }
    }
  },

  // --- Status ---
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED', 'UNDER_REVIEW'],
    default: 'DRAFT',
  },

  // --- TWO-ENVELOPE DOCUMENTATION (Cloudinary) ---
  // Split for professional "Technical vs Financial" evaluation
  technicalDocs: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    name: { type: String, required: true },
    fileType: { type: String }
  }],
  financialDocs: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    name: { type: String, required: true },
    fileType: { type: String }
  }],

  // --- PRESERVED AI & SCORING FIELDS ---
  anomalyScore: { type: Number, default: 0 }, // Used for flagging Abnormally Low Bids
  aiRank: { type: Number },
  aiNotes: { type: String },
  score: { type: Number, min: 0, max: 100 }, // Technical score assigned by AI
  notes: { type: String, trim: true }, // Bidder's cover letter/proposal notes

}, { timestamps: true });

// Index for quick lookup on tender results
bidSchema.index({ tender: 1, amount: 1, status: 1 });

module.exports = mongoose.model('Bid', bidSchema);