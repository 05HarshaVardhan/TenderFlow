const express = require('express');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const teamController = require('../controllers/teamController');

const router = express.Router();

router.get('/my-teams', auth, teamController.getMyTeams);
router.post('/', auth, requireRole('COMPANY_ADMIN', 'SUPER_ADMIN'), teamController.createTeam);

module.exports = router;
