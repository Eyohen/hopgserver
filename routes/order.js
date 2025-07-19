
// routes/order.js
const express = require('express');
const { createOrder, getUserOrders, getOrderById, updateOrderStatus } = require('../controller/order');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, createOrder);
router.get('/', verifyToken, getUserOrders);
router.get('/:id', verifyToken, getOrderById);
router.put('/:id/status', verifyToken, verifyAdmin, updateOrderStatus);

module.exports = router;