const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const controller = require('../controllers/meetingController');

const router = Router();
router.use(verifyToken);
router.post('/create', controller.create);
router.get('/', controller.list);
router.put('/accept/:id', controller.accept);
router.put('/reject/:id', controller.reject);
router.delete('/:id', controller.remove);

// Preserve the original create URL for existing clients.
router.post('/', controller.create);
module.exports = router;
