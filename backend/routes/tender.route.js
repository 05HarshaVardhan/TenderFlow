// backend/routes/tender.routes.js

const express = require('express');
const router = express.Router();
const tenderController = require('../controllers/tender.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');


const { createTenderSchema, updateTenderSchema } = require('../validators/tender.validator');

console.log("Type of auth:", typeof auth);
console.log("Type of tenderController.getMyTenders:", typeof tenderController.getMyTenders);
console.log("Type of tenderController.getAllTenders:", typeof tenderController.getAllTenders);
console.log("Type of tenderController.getTenderById:", typeof tenderController.getTenderById);
console.log("Type of tenderController.getCompanyTendersByStatus:", typeof tenderController.getCompanyTendersByStatus);

// NEW: Get tenders created by the logged-in user
// THIS LINE WAS MISSING OR NOT SAVED
router.get('/my', tenderController.getMyTenders);

// Get all tenders (this now functions for general/public tenders, not specific user's)
router.get('/all',auth, tenderController.getAllTenders);

// Get tender by ID (This must come AFTER specific routes like /my)
router.get('/:id', tenderController.getTenderById);

// Get tenders of logged-in company filtered by status (if distinct from /my)
router.get('/my/status', auth, tenderController.getCompanyTendersByStatus);


// Create tender
router.post('/', auth, validate(createTenderSchema), tenderController.createTender);


router.patch('/close/:id', auth, tenderController.closeTenderManually);// to be tested

router.put('/:id', auth, validate(updateTenderSchema), tenderController.updateTender);

// Delete tender
router.delete('/:id', auth, tenderController.deleteTender);


module.exports = router;
