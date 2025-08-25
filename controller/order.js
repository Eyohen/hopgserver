
// // controller/order.js
// const db = require('../models');
// const { Order, OrderItem, Product, User, Address, Payment } = db;
// const { v4: uuidv4 } = require('uuid');

// const generateOrderNumber = () => {
//   return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
// };

// const createOrder = async (req, res) => {
//   const transaction = await db.sequelize.transaction();

//   try {
//     const { items, shippingAddressId, paymentMethod } = req.body;
//     const userId = req.user.id;

//     // Validate address
//     const address = await Address.findOne({ where: { id: shippingAddressId, userId } });
//     if (!address) {
//       return res.status(400).json({ message: 'Invalid shipping address' });
//     }

//     // Calculate totals
//     let subtotal = 0;
//     const orderItems = [];

//     for (const item of items) {
//       const product = await Product.findByPk(item.productId);
//       if (!product) {
//         throw new Error(`Product ${item.productId} not found`);
//       }

//       if (product.stockQuantity < item.quantity) {
//         throw new Error(`Insufficient stock for ${product.name}`);
//       }

//       const itemSubtotal = product.price * item.quantity;
//       subtotal += itemSubtotal;

//       orderItems.push({
//         productId: item.productId,
//         quantity: item.quantity,
//         price: product.price,
//         subtotal: itemSubtotal,
//         selectedFlavor: item.selectedFlavor,
//         selectedSize: item.selectedSize
//       });

//       // Update stock
//       await product.update({ 
//         stockQuantity: product.stockQuantity - item.quantity,
//         salesCount: product.salesCount + item.quantity
//       }, { transaction });
//     }

//     const shipping = subtotal > 50 ? 0 : 9.99;
//     const tax = subtotal * 0.08;
//     const total = subtotal + shipping + tax;

//     // Create order
//     const order = await Order.create({
//       orderNumber: generateOrderNumber(),
//       userId,
//       subtotal,
//       tax,
//       shipping,
//       total,
//       shippingAddressId,
//       status: 'pending'
//     }, { transaction });

//     // Create order items
//     for (const item of orderItems) {
//       await OrderItem.create({
//         orderId: order.id,
//         ...item
//       }, { transaction });
//     }

//     // Create payment record
//     await Payment.create({
//       orderId: order.id,
//       userId,
//       paymentMethod,
//       amount: total,
//       status: 'pending'
//     }, { transaction });

//     await transaction.commit();

//     // Fetch complete order
//     const completeOrder = await Order.findByPk(order.id, {
//       include: [
//         {
//           model: OrderItem,
//           as: 'orderItems',
//           include: [{ model: Product, as: 'product' }]
//         },
//         {
//           model: Address,
//           as: 'shippingAddress'
//         },
//         {
//           model: Payment,
//           as: 'payment'
//         }
//       ]
//     });

//     res.status(201).json({
//       message: 'Order created successfully',
//       order: completeOrder
//     });
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ message: 'Failed to create order', error: error.message });
//   }
// };


// const getUserOrders = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { page = 1, limit = 10, status } = req.query;

//     const where = { userId };
//     if (status) where.status = status;

//     const orders = await Order.findAndCountAll({
//       where,
//       include: [
//         {
//           model: OrderItem,
//           as: 'orderItems',
//           include: [{ model: Product, as: 'product' }]
//         },
//         {
//           model: Address,
//           as: 'shippingAddress'
//         },
//         {
//           model: User,  // ADD THIS
//           as: 'user',   // ADD THIS
//           attributes: ['firstName', 'lastName', 'email'] // ADD THIS
//         }
//       ],
//       order: [['createdAt', 'DESC']],
//       limit: parseInt(limit),
//       offset: (page - 1) * limit
//     });

//     res.json({
//       orders: orders.rows,
//       pagination: {
//         total: orders.count,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         pages: Math.ceil(orders.count / limit)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to get orders', error: error.message });
//   }
// };


// const getOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const order = await Order.findOne({
//       where: { id, userId },
//       include: [
//         {
//           model: OrderItem,
//           as: 'orderItems',
//           include: [{ model: Product, as: 'product' }]
//         },
//         {
//           model: Address,
//           as: 'shippingAddress'
//         },
//         {
//           model: Payment,
//           as: 'payment'
//         }
//       ]
//     });

//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     res.json({ order });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to get order', error: error.message });
//   }
// };

// const updateOrderStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, trackingNumber } = req.body;

//     const order = await Order.findByPk(id);
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     const updateData = { status };
//     if (trackingNumber) updateData.trackingNumber = trackingNumber;
//     if (status === 'shipped') updateData.shippedAt = new Date();
//     if (status === 'delivered') updateData.deliveredAt = new Date();

//     await order.update(updateData);

//     res.json({ message: 'Order status updated successfully', order });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to update order status', error: error.message });
//   }
// };

// module.exports = { createOrder, getUserOrders, getOrderById, updateOrderStatus };



















// controller/order.js (Updated with discount support)
const db = require('../models');
const { Order, OrderItem, Product, User, Address, Payment, Discount, DiscountUsage } = db;
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const generateOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const createOrder = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { items, shippingAddressId, paymentMethod, discountCode } = req.body;
    const userId = req.user.id;

    // Validate address
    const address = await Address.findOne({ where: { id: shippingAddressId, userId } });
    if (!address) {
      return res.status(400).json({ message: 'Invalid shipping address' });
    }

    // Calculate subtotal
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

    // Handle discount validation and calculation
    let discount = null;
    let discountAmount = 0;

    if (discountCode) {
      discount = await Discount.findOne({
        where: { 
          code: discountCode.toUpperCase(),
          isActive: true,
          validFrom: { [Op.lte]: new Date() },
          [Op.or]: [
            { validUntil: null },
            { validUntil: { [Op.gte]: new Date() } }
          ]
        }
      });

      if (!discount) {
        throw new Error('Invalid or expired discount code');
      }

      // Check usage limits
      if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
        throw new Error('Discount code usage limit exceeded');
      }

      // Check minimum order amount
      if (subtotal < discount.minOrderAmount) {
        throw new Error(`Minimum order amount of ₦${discount.minOrderAmount} required for this discount`);
      }

      // Check user usage limit
      if (discount.userUsageLimit) {
        const userUsageCount = await DiscountUsage.count({
          where: { discountId: discount.id, userId }
        });

        if (userUsageCount >= discount.userUsageLimit) {
          throw new Error('You have reached the usage limit for this discount code');
        }
      }

      // Calculate discount amount
      if (discount.type === 'percentage') {
        discountAmount = (subtotal * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }

      // Apply maximum discount limit
      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }

      discountAmount = Math.min(discountAmount, subtotal); // Can't discount more than subtotal
    }

    const shipping = subtotal > 23000 ? 0 : 2500; // Free shipping over ₦23,000
    const tax = (subtotal - discountAmount) * 0.075; // 7.5% VAT on discounted amount
    const total = subtotal - discountAmount + shipping + tax;

    // Create order
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId,
      subtotal,
      discountAmount,
      discountId: discount ? discount.id : null,
      discountCode: discountCode || null,
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
      status: 'pending',
      currency: 'NGN'
    }, { transaction });

    // If discount was used, create usage record and update count
    if (discount) {
      await DiscountUsage.create({
        discountId: discount.id,
        userId,
        orderId: order.id,
        discountAmount,
        originalAmount: subtotal,
        finalAmount: total
      }, { transaction });

      await discount.update({
        usageCount: discount.usageCount + 1
      }, { transaction });
    }

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
        },
        {
          model: Discount,
          as: 'discount'
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
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: Discount,
          as: 'discount',
          attributes: ['code', 'name', 'type', 'value']
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
        },
        {
          model: Discount,
          as: 'discount'
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