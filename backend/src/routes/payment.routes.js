const express = require('express');
const router = express.Router();
const payment = require('../controllers/payment.controller');

// Gateway callbacks (public, no auth required - they verify via TX token)
router.post('/success', payment.gatewaySuccess);
router.post('/fail', payment.gatewayFail);
router.post('/cancel', payment.gatewayCancel);
router.post('/ipn', payment.gatewayIpn);

module.exports = router;
