const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/settings.controller');

router.use(authRequired);
router.get('/store', asyncHandler(ctrl.getStore));
router.put('/store', requireRole('owner', 'admin'), asyncHandler(ctrl.updateStore));

module.exports = router;
