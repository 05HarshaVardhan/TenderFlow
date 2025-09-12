const express = require('express');
const router = express.Router();

const applicationController = require('../controllers/application.controller.js');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate.js');
const { createApplicationSchema } = require('../validators/application.validator.js');

// ✅ Create application (only logged-in users can apply)
router.post(
  '/',
  authMiddleware,
  validate(createApplicationSchema),
  applicationController.createApplication
);

// ✅ Get all applications (supports filters)
router.get('/', applicationController.getAllApplications);

// ✅ Get applications for a specific tender (owned by the logged-in company)
router.get('/tender/:tenderId', authMiddleware, applicationController.getApplicationsForTender);

// ✅ Get logged-in company's applications filtered by status
router.get('/my/status', authMiddleware, applicationController.getMyApplicationsByStatus);

// ✅ Accept a specific application (for company that owns the tender)
router.post('/:id/accept', authMiddleware, applicationController.acceptApplication);

// ✅ Get a single application by ID (restricted to owner — should add protection in controller)
router.get('/:id', authMiddleware, applicationController.getApplicationById);

// ✅ Delete an application (only by the company that created it)
router.delete('/:id', authMiddleware, applicationController.deleteApplication);

module.exports = router;
