const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    tender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tender',
      required: true,
    },
    bidderCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryDays: {
      type: Number,
      min: 0,
    },
    validTill: {
      type: Date,
    },

    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED'],
      default: 'DRAFT',
    },

    // documents attached to bid
    documents: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // AI / scoring fields
    anomalyScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    aiRank: {
      type: Number,
      min: 0,
    },
    aiNotes: {
      type: String,
    },
    score: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bid', bidSchema);
