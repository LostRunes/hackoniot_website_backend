import { Router } from 'express';
import { adminAuth } from './adminAuth.js';
import path from 'path';

const router = Router();
const __dirname = path.resolve();

// Protect all admin routes with simple basic auth
router.use(adminAuth);

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// The actual socket trigger endpoint
import { triggerAdminEvent, getMenteeState, clearLeaderboardCache } from '../controllers/apiController.js';
router.get('/mentee-state', getMenteeState);
router.post('/trigger', triggerAdminEvent);

// Could easily add pure API endpoints here for editing database models directly
import Question from '../models/Question.js';
import Participant from '../models/Participant.js';
import FinalResult from '../models/FinalResult.js';

router.post('/questions/:quizId', async (req, res) => {
    // Add logic to save new question
    const { quizId } = req.params;
    const q = new Question({ ...req.body, quizId });
    await q.save();
    res.json(q);
});

router.delete('/leaderboard/:quizId', async (req, res) => {
    const { quizId } = req.params;
    // Clear leaderboard logic
    await Participant.deleteMany({ quizId });

    // Clear cache
    const io = req.app.get('io');
    clearLeaderboardCache(quizId, io);

    // Broadcast empty leaderboard
    if (io) io.emit(`leaderboardUpdate_${quizId}`, []);
    res.json({ success: true });
});

// Use the controller functions since they handle caching
import { addFinalResult, deleteFinalResult } from '../controllers/apiController.js';

router.post('/final-results', addFinalResult);
router.delete('/final-results/:id', deleteFinalResult);

export default router;
