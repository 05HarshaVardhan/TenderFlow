// backend/src/models/Tender.js
const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Ownership & Relationships
    ownerCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Array of references to the Bid model
    bids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bid',
      },
    ],

    // Lifecycle State
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED'],
      default: 'DRAFT',
    },

    // Commercial / Timing
    budgetMin: {
      type: Number,
    },
    budgetMax: {
      type: Number,
    },
    emdAmount: {
      type: Number,
      min: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },

    // Classification / Search
    category: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Documents attached to tender
    documents: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // AI & Advanced fields
    embedding: {
      type: [Number], // vector for semantic search
      default: [],
    },
    aiSummary: {
      type: String,
    },
    aiFlags: {
      type: mongoose.Schema.Types.Mixed,
    },
    evaluationCriteria: {
      type: mongoose.Schema.Types.Mixed,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

module.exports = mongoose.model('Tender', tenderSchema);