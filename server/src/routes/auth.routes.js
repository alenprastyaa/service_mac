const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/login', asyncHandler(ctrl.login));
router.get('/me', authRequired, asyncHandler(ctrl.me));
router.put('/password', authRequired, asyncHandler(ctrl.changePassword));

module.exports = router;
