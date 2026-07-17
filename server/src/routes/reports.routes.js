const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/reports.controller');

router.use(authRequired, requireRole('owner', 'admin'));
router.get('/sales', asyncHandler(ctrl.salesReport));
router.get('/profit', asyncHandler(ctrl.profitReport));
router.get('/stock', asyncHandler(ctrl.stockReport));
router.get('/service', asyncHandler(ctrl.serviceReport));

module.exports = router;
