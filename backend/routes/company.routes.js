const express = require('express');
const router = express.Router();

const companyController = require('../controllers/company.controller');
const authMiddleware = require('../middleware/auth.js');
const upload = require('../utils/upload.js');
const validate = require('../middleware/validate.js');
const updateProfilePhoto = require("../controllers/profilephoto.controller.js");
const {
  createCompanySchema,
  updateCompanySchema,
  addGoodsServicesSchema
} = require('../validators/company.validator.js');

// Static/specific routes first

// Filter companies (by name, industry, goodsServices)
router.get('/filter/advanced', companyController.filterCompanies);

// Get minimal list of companies for dropdown/select
router.get('/select', companyController.getCompaniesForSelection);

// Create a company (Zod validation + logo upload)
router.post(
  '/create',
  authMiddleware,
  upload.single('logo'),
  validate(createCompanySchema),
  companyController.createCompany
);

// Get all companies
router.get('/', companyController.getAllCompanies);

// Update a company (Zod validation + logo upload)
router.put(
  '/:id',
  authMiddleware,
  upload.single('logo'),
  validate(updateCompanySchema),
  companyController.updateCompany
);

// Add goods/services to company
router.post(
  '/:id/goods-services',
  authMiddleware,
  validate(addGoodsServicesSchema),
  companyController.addGoodsServicesToCompany
);

// Update company logo using Cloudinary
router.put(
  '/:id/logo', // Matches req.params.id for company ID
  authMiddleware,
  upload.single('profilePicture'), // Field name should match your frontend form
  updateProfilePhoto.updateCompanyLogo // Updated controller which uses Cloudinary
);

// Get companies by a goods/service ID
router.get('/by-service/:goodsServiceId', companyController.getCompaniesByGoodsService);

// Dynamic route: Get company by ID
router.get('/:id', companyController.getCompanyById);

// Delete a company
router.delete('/:id', authMiddleware, companyController.deleteCompany);

module.exports = router;
