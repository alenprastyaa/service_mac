const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/suppliers.controller');

router.use(authRequired);
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.post('/', requireRole('owner', 'admin'), asyncHandler(ctrl.create));
router.put('/:id', requireRole('owner', 'admin'), asyncHandler(ctrl.update));
router.delete('/:id', requireRole('owner', 'admin'), asyncHandler(ctrl.remove));

router.post('/:id/debts', requireRole('owner', 'admin'), asyncHandler(ctrl.addDebt));
router.put('/:id/debts/:debtId/pay', requireRole('owner', 'admin'), asyncHandler(ctrl.payDebt));
router.delete('/:id/debts/:debtId', requireRole('owner', 'admin'), asyncHandler(ctrl.removeDebt));

module.exports = router;
