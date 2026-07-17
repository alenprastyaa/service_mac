const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/sales.controller');

router.use(authRequired, requireRole('owner', 'admin', 'kasir'));
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id/status', asyncHandler(ctrl.updateStatus));

module.exports = router;
