import { Router } from 'express';
import {
    joinQuiz, submitQuiz, getLeaderboard, getQuestions,
    triggerAdminEvent, getFinalResults, getMenteeState
} from '../controllers/apiController.js';

const router = Router();

// Participant routes
router.post('/join/:quizId', joinQuiz);
router.post('/submit-quiz/:quizId', submitQuiz);
router.get('/leaderboard/:quizId', getLeaderboard);
router.get('/questions/:quizId', getQuestions);
router.get('/final-results', getFinalResults);
router.get('/mentee-state', getMenteeState);

// Admin trigger route (simplistic setup via fetch from admin dashboard)
router.post('/admin/trigger', triggerAdminEvent);

// Could potentially add more admin CRUD for questions/leaderboard here

export default router;
