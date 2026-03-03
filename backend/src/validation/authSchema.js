
//backend\src\validation\authSchema.js
const Joi = require('joi');

const registerCompanyAdminSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Company name is required',
  }),
  emailDomain: Joi.string()
    .trim()
    .lowercase()
    .replace(/^@/, '')
    .domain({ tlds: { allow: false } })
    .required()
    .messages({
      'string.domain': 'Enter a valid company domain (example.com)',
      'string.empty': 'Company email domain is required',
    }),
  industry: Joi.string().trim().max(120).allow('', null),
  services: Joi.array()
    .items(Joi.string().trim().min(2).max(100))
    .max(20)
    .default([])
    .custom((value) => {
      const seen = new Set();
      return value.filter((item) => {
        const normalized = item.toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }),
  adminName: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Admin name is required',
  }),
  adminEmail: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Enter a valid admin email address',
    'string.empty': 'Admin email is required',
  }),
  adminPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must include uppercase, lowercase, number, and special character',
    }),
}).custom((value, helpers) => {
  const adminEmailDomain = value.adminEmail.split('@')[1];
  if (adminEmailDomain !== value.emailDomain) {
    return helpers.error('any.invalid', {
      message: 'Admin email must belong to the provided company domain',
    });
  }
  return value;
}, 'Admin email-domain match validation').messages({
  'any.invalid': '{{#message}}',
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

const registerSuperAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Name is required',
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Enter a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must include uppercase, lowercase, number, and special character',
    }),
  setupKey: Joi.string().trim().min(8).max(256).required().messages({
    'string.empty': 'Setup key is required',
  }),
});

module.exports = {
  registerCompanyAdminSchema,
  loginSchema,
  registerSuperAdminSchema,
};
