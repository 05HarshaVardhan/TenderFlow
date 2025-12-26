const Joi = require('joi');

const createBidSchema = Joi.object({
  tenderId: Joi.string().length(24).hex().required(), // Mongo ObjectId
  amount: Joi.number().min(0).required(),
  deliveryDays: Joi.number().integer().min(0).allow(null),
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

const updateDraftBidSchema = Joi.object({
  amount: Joi.number().min(0).optional(),
  deliveryDays: Joi.number().integer().min(0).optional(),
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
}).min(1); // at least one field

module.exports = {
  createBidSchema,
  updateDraftBidSchema,
};
