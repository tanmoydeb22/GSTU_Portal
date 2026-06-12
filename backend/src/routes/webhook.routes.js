const express = require('express');
const router = express.Router();
const payment = require('../controllers/payment.controller');

// These routes must not be protected by JWT because they are called by SSLCommerz servers directly
router.post('/success', payment.gatewaySuccess);
router.post('/fail', payment.gatewayFail);
router.post('/cancel', payment.gatewayCancel);
router.post('/ipn', payment.gatewayIpn);

module.exports = router;
