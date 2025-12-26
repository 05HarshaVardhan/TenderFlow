const Joi = require('joi');

const registerCompanyAdminSchema = Joi.object({
  companyName: Joi.string().min(2).max(200).required(),
  emailDomain: Joi.string().domain().required(),
  industry: Joi.string().allow('', null),
  services: Joi.array().items(Joi.string().trim()).default([]),
  adminName: Joi.string().min(2).max(200).required(),
  adminEmail: Joi.string().email().required(),
  adminPassword: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

module.exports = {
  registerCompanyAdminSchema,
  loginSchema,
};
