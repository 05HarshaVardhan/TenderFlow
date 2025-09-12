const express = require("express");
const {getDashboardData} = require("../controllers/dashboard.controller.js");
const  verifyToken  = require("../middleware/auth.js");

const router = express.Router();

router.get("/", verifyToken, getDashboardData);

module.exports = router;
