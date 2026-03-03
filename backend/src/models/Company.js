
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
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    logo: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    certificates: [
      {
        title: { type: String, trim: true, required: true },
        description: { type: String, trim: true, default: '' },
        fileUrl: { type: String, trim: true, required: true },
        filePublicId: { type: String, trim: true, required: true },
        isPublic: { type: Boolean, default: true },
        issuedBy: { type: String, trim: true, default: '' },
        validFrom: { type: Date },
        validTill: { type: Date },
        createdAt: { type: Date, default: Date.now },
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
