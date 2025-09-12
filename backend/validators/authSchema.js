const { z } = require("zod");

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  companyId: z.number().optional()
});

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

module.exports = {
  signupSchema,
  loginSchema
};
