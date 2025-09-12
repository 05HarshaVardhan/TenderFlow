const { z } = require('zod');

const createTenderSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  deadline: z
    .string()
    .refine((val) => {
      const selectedDate = new Date(val);
      const today = new Date();
      // compare only date part (not time)
      return selectedDate.setHours(0, 0, 0, 0) >= today.setHours(0, 0, 0, 0);
    }, {
      message: "Deadline cannot be a past date"
    }),
  budget: z.number().min(0, "Budget must be a positive number"),
});

const updateTenderSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().min(10).optional(),
  deadline: z.preprocess(
    (val) => typeof val === "string" ? new Date(val) : val,
    z.date({ invalid_type_error: "Invalid date" }).optional()
  ),
  budget: z.preprocess(
    (val) => parseFloat(val),
    z.number().min(0).optional()
  ),
  // ✅ ADD THIS LINE for the status field!
  status: z.enum(['Active', 'Expired', 'Application Closed']).optional()
});
module.exports = {
  createTenderSchema,
  updateTenderSchema
};
