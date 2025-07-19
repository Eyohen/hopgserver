
// controllers/cart.js
const db = require('../models');
const { Cart, Product, User } = db;

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, selectedFlavor, selectedSize } = req.body;
    const userId = req.user.id;

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if item already exists in cart
    const existingItem = await Cart.findOne({
      where: { userId, productId, selectedFlavor, selectedSize }
    });

    if (existingItem) {
      // Update quantity
      await existingItem.update({ quantity: existingItem.quantity + quantity });
      res.json({ message: 'Cart updated successfully', cartItem: existingItem });
    } else {
      // Add new item to cart
      const cartItem = await Cart.create({
        userId,
        productId,
        quantity,
        selectedFlavor,
        selectedSize
      });
      res.status(201).json({ message: 'Item added to cart', cartItem });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to add to cart', error: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'imageUrl', 'stockQuantity', 'isActive']
        }
      ]
    });

    res.json({ cartItems });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get cart', error: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    const cartItem = await Cart.findOne({ where: { id, userId } });
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cartItem.update({ quantity });
    res.json({ message: 'Cart item updated successfully', cartItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cart item', error: error.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await Cart.destroy({ where: { id, userId } });

    if (deleted) {
      res.json({ message: 'Item removed from cart' });
    } else {
      res.status(404).json({ message: 'Cart item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove from cart', error: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await Cart.destroy({ where: { userId } });
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart', error: error.message });
  }
};

module.exports = { addToCart, getCart, updateCartItem, removeFromCart, clearCart };