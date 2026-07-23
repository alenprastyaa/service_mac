const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/services.controller');

router.use(authRequired, requireRole('owner', 'admin', 'kasir', 'teknisi'));
router.get('/technicians', asyncHandler(ctrl.technicians));
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.get));
router.post('/', requireRole('owner', 'admin', 'kasir'), asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.put('/:id/checklist', requireRole('owner', 'admin', 'kasir'), asyncHandler(ctrl.updateChecklist));
router.put('/:id/status', asyncHandler(ctrl.updateStatus));
router.post('/:id/items', asyncHandler(ctrl.addItem));
router.delete('/:id/items/:itemId', asyncHandler(ctrl.removeItem));
router.delete('/:id', requireRole('owner', 'admin'), asyncHandler(ctrl.remove));

module.exports = router;
