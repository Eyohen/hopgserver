
// routes/cart.js
const express = require('express');
const { addToCart, getCart, updateCartItem, removeFromCart, clearCart } = require('../controller/cart');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, addToCart);
router.get('/', verifyToken, getCart);
router.put('/:id', verifyToken, updateCartItem);
router.delete('/:id', verifyToken, removeFromCart);
router.delete('/', verifyToken, clearCart);

module.exports = router;