
// controller/order.js
const db = require('../models');
const { Order, OrderItem, Product, User, Address, Payment } = db;
const { v4: uuidv4 } = require('uuid');

const generateOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const createOrder = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { items, shippingAddressId, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate address
    const address = await Address.findOne({ where: { id: shippingAddressId, userId } });
    if (!address) {
      return res.status(400).json({ message: 'Invalid shipping address' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal,
        selectedFlavor: item.selectedFlavor,
        selectedSize: item.selectedSize
      });

      // Update stock
      await product.update({ 
        stockQuantity: product.stockQuantity - item.quantity,
        salesCount: product.salesCount + item.quantity
      }, { transaction });
    }

    const shipping = subtotal > 50 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    // Create order
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId,
      subtotal,
      tax,
      shipping,
      total,
      shippingAddressId,
      status: 'pending'
    }, { transaction });

    // Create order items
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        ...item
      }, { transaction });
    }

    // Create payment record
    await Payment.create({
      orderId: order.id,
      userId,
      paymentMethod,
      amount: total,
      status: 'pending'
    }, { transaction });

    await transaction.commit();

    // Fetch complete order
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [{ model: Product, as: 'product' }]
        },
        {
          model: Address,
          as: 'shippingAddress'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: completeOrder
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};


const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [{ model: Product, as: 'product' }]
        },
        {
          model: Address,
          as: 'shippingAddress'
        },
        {
          model: User,  // ADD THIS
          as: 'user',   // ADD THIS
          attributes: ['firstName', 'lastName', 'email'] // ADD THIS
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(orders.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get orders', error: error.message });
  }
};


const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          model: OrderItem,
          as: 'orderItems',
          include: [{ model: Product, as: 'product' }]
        },
        {
          model: Address,
          as: 'shippingAddress'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get order', error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (status === 'shipped') updateData.shippedAt = new Date();
    if (status === 'delivered') updateData.deliveredAt = new Date();

    await order.update(updateData);

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

module.exports = { createOrder, getUserOrders, getOrderById, updateOrderStatus };