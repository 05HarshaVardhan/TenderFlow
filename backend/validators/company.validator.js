const { z } = require('zod');

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100, "Company name is too long"),
  industry: z.string().max(100, "Industry name is too long").optional(),
  description: z.string().max(1000, "Description is too long").optional()
});

const updateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100, "Company name is too long").optional(),
  industry: z.string().max(100, "Industry name is too long").optional(),
  description: z.string().max(1000, "Description is too long").optional()
});

// ✅ Add Goods/Services Schema
const addGoodsServicesSchema = z.object({
  services: z
    .array(
      z
        .string()
        .min(2, 'Service name must be at least 2 characters')
        .max(100, 'Service name must be at most 100 characters')
    )
    .nonempty('At least one goods/service is required')
});

module.exports = {
  createCompanySchema,
  updateCompanySchema,
  addGoodsServicesSchema
};
