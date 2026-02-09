
//backend\src\models\Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emailDomain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // verification / risk
    verificationScore: {
      type: Number,
      default: 0, // 0–100
      min: 0,
      max: 100,
    },
    badge: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'RISK'],
      default: 'PENDING',
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
    },

    // industry / services / location
    industry: {
      type: String,
      trim: true,
    },
    services: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      country: { type: String, trim: true },
      state: { type: String, trim: true },
      city: { type: String, trim: true },
    },

    // registration & contacts
    registrationNumber: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Company', companySchema);
