const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/notifications.controller');

router.use(authRequired);
router.get('/', asyncHandler(ctrl.list));
router.get('/unread-count', asyncHandler(ctrl.unreadCount));
router.put('/read-all', asyncHandler(ctrl.markAllRead));
router.put('/:id/read', asyncHandler(ctrl.markRead));

module.exports = router;
