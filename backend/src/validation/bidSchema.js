const Joi = require('joi');

// 1. Base Logic: What is allowed to enter the database initially
const createBidSchema = Joi.object({
  tenderId: Joi.string().length(24).hex().required(),
  amount: Joi.number().min(0).required(), // Add .coerce() if using Joi globally
  deliveryDays: Joi.number().integer().min(0).allow(null),
  status: Joi.string().valid('DRAFT', 'SUBMITTED').default('DRAFT'),
  notes: Joi.string().max(2000).allow('', null),
  // Allow the new fields but keep them optional for the DRAFT stage
  transactionId: Joi.string().allow('', null),
  paymentMode: Joi.string().valid('ONLINE', 'DD', 'BG', 'NA').optional()
});

// 2. The Strict Logic: Used specifically in the /submit route
const submitBidSchema = Joi.object({
  amount: Joi.number().min(1).required(),
  deliveryDays: Joi.number().integer().min(1).required(),
  notes: Joi.string().required(),
  
  // FIX: Change this from 'emdPaymentProof.transactionId' to a nested object
  emdPaymentProof: Joi.object({
    transactionId: Joi.string().required(),
    paymentMode: Joi.string().valid('ONLINE', 'DD', 'BG', 'NA').required(),
    receiptDoc: Joi.any().optional() // File existence is checked in the route logic
  }).required()
}).unknown(true);

module.exports = {
  createBidSchema,
  submitBidSchema // Replace updateDraft with this for the Submit gatekeeper
};