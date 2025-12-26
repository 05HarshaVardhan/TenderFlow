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

    // ownership
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

    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED'],
      default: 'DRAFT',
    },

    // commercial / timing
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

    // classification / search
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

    // documents attached to tender
    documents: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // AI fields
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
    timestamps: true,
  }
);

module.exports = mongoose.model('Tender', tenderSchema);
