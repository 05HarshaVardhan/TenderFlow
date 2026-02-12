const Joi = require('joi');



// Base schema: Minimal requirements for a DRAFT

const tenderBaseSchema = {

  title: Joi.string().required().trim(),

  description: Joi.string().required(),

  category: Joi.string().required(),

  // All other fields are optional for drafts

  estimatedValue: Joi.number().min(0).optional(),

  emdAmount: Joi.number().min(0).optional(),

  endDate: Joi.date().optional(),

};



const createTenderSchema = Joi.object(tenderBaseSchema);



// Strict schema: Mandatory fields for PUBLISHING

const publishTenderSchema = Joi.object({

  ...tenderBaseSchema,

  estimatedValue: Joi.number().min(1).required(),

  emdAmount: Joi.number().min(1).required().messages({
    'number.min': 'EMD Amount must be greater than 0 to publish.'
  }),

  endDate: Joi.date().greater('now').required(),

  category: Joi.string().required(),

});



module.exports = { createTenderSchema, publishTenderSchema };