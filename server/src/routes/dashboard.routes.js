const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(authRequired);
router.get('/summary', asyncHandler(ctrl.summary));
router.get('/sales-chart', asyncHandler(ctrl.salesChart));

module.exports = router;
