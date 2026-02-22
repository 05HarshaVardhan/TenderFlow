const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
  // --- Core Details ---
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  referenceNumber: { 
    type: String, 
    unique: true, 
    default: () => `TND-${Math.floor(100000 + Math.random() * 900000)}` 
  },

  // --- Ownership ---
  ownerCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bid' }],

  // --- Status ---
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED'],
    default: 'DRAFT',
  },

  // --- Financial Details (The "Heavy" Fields) ---
  estimatedValue: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  
  // EMD & Bid Security
  emdAmount: { type: Number, default: 0 },
  bidSecurityPercentage: { type: Number, default: 0 }, // Often 2-5% of Tender Value
  
  // Payment Metadata
  emdPaymentDetails: {
    mode: { type: String, enum: ['ONLINE', 'DD', 'BG', 'NA'], default: 'ONLINE' },
    accountDetails: { type: String }, // Bank info for transfer
    validityPeriod: { type: Number }, // How many days the bid remains valid
  },

  // Risk Management
  abnormallyLowBidThreshold: { 
    type: Number, 
    default: 20, 
    help: "Percentage below estimatedValue that triggers a red flag" 
  },

  // --- Timing ---
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  openingDate: { type: Date }, // Technical/Financial unsealing date

  // --- Classification ---
  category: { type: String, trim: true, required: true },
  department: { type: String, trim: true },
  tags: [{ type: String, trim: true }],

  // --- Documents (Cloudinary) ---
  documents: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    name: { type: String, required: true },
    fileType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],

  // --- PRESERVED AI & ADVANCED FIELDS ---
  embedding: { type: [Number], default: [] },
  aiSummary: { type: String },
  aiFlags: { type: mongoose.Schema.Types.Mixed, default: {} },
  analysisReport: {
    model: { type: String, default: null },
    generatedAt: { type: Date },
    summary: { type: String, default: "" },
    ranking: { type: [mongoose.Schema.Types.Mixed], default: [] },
    risks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recommendation: { type: String, default: "" },
    deterministicScores: { type: [mongoose.Schema.Types.Mixed], default: [] },
    statistics: { type: mongoose.Schema.Types.Mixed, default: {} },
    fallbackReason: { type: String, default: "" }
  },
  evaluationCriteria: { type: mongoose.Schema.Types.Mixed },
  viewsCount: { type: Number, default: 0 },

}, { timestamps: true });

// Create indexes for searching
tenderSchema.index({ title: 'text', category: 'text', referenceNumber: 1 });

module.exports = mongoose.model('Tender', tenderSchema);
