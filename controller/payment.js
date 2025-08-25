
// controller/payment.js
const db = require('../models');
const { Payment, Order } = db;

const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentReference, paymentMethod = 'paystack' } = req.body;
    const userId = req.user.id;

    // Get order details
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update payment record
    await Payment.update({
      paystackReference: paymentReference,
      status: 'success',
      transactionId: paymentReference,
      paidAt: new Date()
    }, { where: { orderId } });

    // Update order status to processing
    await Order.update({
      status: 'processing'
    }, { where: { id: orderId } });

    res.json({
      message: 'Payment confirmed successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment confirmation failed', error: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId, status, paymentReference } = req.body;
    const userId = req.user.id;

    // Get order details
    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update payment record
    await Payment.update({
      status,
      paystackReference: paymentReference,
      paidAt: status === 'success' ? new Date() : null
    }, { where: { orderId } });

    // Update order status based on payment status
    let orderStatus = 'pending';
    if (status === 'success') {
      orderStatus = 'processing';
    } else if (status === 'failed') {
      orderStatus = 'cancelled';
    }

    await Order.update({ status: orderStatus }, { where: { id: orderId } });

    res.json({
      message: 'Payment status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment status update failed', error: error.message });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { orderId },
      include: [
        {
          model: Order,
          as: 'order',
          where: { userId }
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get payment status', error: error.message });
  }
};

module.exports = { confirmPayment, updatePaymentStatus, getPaymentStatus };