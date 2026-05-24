const express = require('express');
const router = express.Router();
const { requestLogger } = require('../Logger/logger');

const {
  authMiddleware,
  getItems,
  // createSalesOrder,
  createSalesOrder,
  setOrderStatus,
  login
} = require('../Controller/AlOthaim');

// Log every request + response on all routes
router.use(requestLogger);

router.post('/items', authMiddleware, getItems);
router.get('/items', authMiddleware, getItems);
//router.post('/create-order', authMiddleware, createSalesOrder);
router.post('/create-order', createSalesOrder);
router.post('/order-status', authMiddleware, setOrderStatus);
router.post('/login', login);

module.exports = router;
