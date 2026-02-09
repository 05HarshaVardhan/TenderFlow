//backend\src\validation\tenderSchema.js
const Joi = require('joi');

const createTenderSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).required(),
  budgetMax: Joi.number().min(0).required(),
  emdAmount: Joi.number().min(0).allow(null),
  startDate: Joi.date().iso().allow(null),
  endDate: Joi.date().iso().allow(null),
  category: Joi.string().max(100).allow('', null),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  documents: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        name: Joi.string().required(),
        type: Joi.string().allow('', null),
      })
    )
    .default([]),
});

module.exports = {
  createTenderSchema,
};
