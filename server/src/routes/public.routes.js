const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const servicesCtrl = require('../controllers/services.controller');

// Unauthenticated routes for customer-facing lookups (e.g. QR code on the intake receipt).
router.get('/services/:ticketNo', asyncHandler(servicesCtrl.getPublicStatus));

module.exports = router;
