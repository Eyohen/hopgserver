
// routes/payment.js
const express = require('express');
const { confirmPayment, updatePaymentStatus, getPaymentStatus } = require('../controller/payment');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/confirm', verifyToken, confirmPayment);
router.post('/update-status', verifyToken, updatePaymentStatus);
router.get('/status/:orderId', verifyToken, getPaymentStatus);

module.exports = router;