const express = require('express');
const router = express.Router();

const {
  authMiddleware,
  getItems,
  createSalesOrder,
  CreateTestOrder,
  setOrderStatus,
  login
} = require('../Controller/AlOthaim');

router.post('/items', authMiddleware, getItems);
router.get('/items', authMiddleware, getItems);
router.post('/create-order', authMiddleware, createSalesOrder);
router.post('/create-order-test', CreateTestOrder);
router.post('/order-status', authMiddleware, setOrderStatus);
router.post('/login', login);

module.exports = router;
