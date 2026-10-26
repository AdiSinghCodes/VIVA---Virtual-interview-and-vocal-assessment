const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/liveInterviewController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', requireAuth, controller.list);
router.post('/start', requireAuth, controller.start);
router.post('/:id/answer', requireAuth, controller.answer);
router.get('/:id/preparation-status', requireAuth, controller.preparationStatus);
router.post('/:id/next-question', requireAuth, controller.nextQuestion);
router.post('/:id/transcribe', requireAuth, upload.single('audio'), controller.transcribe);
router.post('/:id/complete', requireAuth, controller.complete);
router.get('/:id', requireAuth, controller.get);

module.exports = router;
