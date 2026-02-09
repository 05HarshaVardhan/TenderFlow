// backend/src/validation/bidSchema.js
const Joi = require('joi');

const createBidSchema = Joi.object({
  tenderId: Joi.string().length(24).hex().required(), 
  amount: Joi.number().min(0).required(),
  deliveryDays: Joi.number().integer().min(0).allow(null),
  // ADD THIS LINE BELOW
  status: Joi.string().valid('DRAFT', 'SUBMITTED').default('DRAFT'), 
  validTill: Joi.date().iso().allow(null),
  documents: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        name: Joi.string().required(),
        type: Joi.string().allow('', null),
      })
    )
    .default([]),
  notes: Joi.string().max(2000).allow('', null),
});

// Update this as well to allow changing status via PATCH if needed
const updateDraftBidSchema = Joi.object({
  amount: Joi.number().min(0).optional(),
  deliveryDays: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('DRAFT', 'SUBMITTED').optional(), 
  validTill: Joi.date().iso().optional(),
  documents: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        name: Joi.string().required(),
        type: Joi.string().allow('', null),
      })
    )
    .optional(),
  notes: Joi.string().max(2000).optional(),
}).min(1);

module.exports = {
  createBidSchema,
  updateDraftBidSchema,
};