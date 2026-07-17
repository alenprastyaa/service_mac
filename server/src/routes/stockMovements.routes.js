const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/stockMovements.controller');

router.use(authRequired);
router.get('/', asyncHandler(ctrl.list));
router.post('/', requireRole('owner', 'admin', 'kasir'), asyncHandler(ctrl.createStockIn));

module.exports = router;
