// routes/analytics.js
const express = require('express');
const { getDashboardStats, getOrderAnalytics } = require('../controller/analytics');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', verifyToken, verifyAdmin, getDashboardStats);
router.get('/orders', verifyToken, verifyAdmin, getOrderAnalytics);

module.exports = router;