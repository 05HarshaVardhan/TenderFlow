const { z } = require('zod');

// Schema for creating a new application
const createApplicationSchema = z.object({
  quotationAmount: z.number().min(0, 'Quotation amount must be a positive number'),
  proposalText: z.string().optional(),
  tenderId: z.number().int('Tender ID must be an integer')
});

// Schema for filtering applications
const filterApplicationSchema = z.object({
  minQuotation: z.coerce.number().optional(),
  maxQuotation: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tenderId: z.coerce.number().optional(),
  companyId: z.coerce.number().optional()
});

module.exports = {
  createApplicationSchema,
  filterApplicationSchema
};
