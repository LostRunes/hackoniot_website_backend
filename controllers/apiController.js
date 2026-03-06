import Participant from '../models/Participant.js';
import FinalResult from '../models/FinalResult.js';
import fs from 'fs';
import path from 'path';

// Cached Leaderboards for performance optimization per quiz
let leaderboardCache = {
    quiz1: [],
    quiz2: [],
    quiz3: [],
    quiz4: [],
    quiz5: [],
    default: []
};
let finalResultsCache = [];

// Helper to refresh and broadcast leaderboard per quiz
const refreshLeaderboard = async (io, quizId) => {
    try {
        if (!quizId) return;
        leaderboardCache[quizId] = await Participant.find({ quizId })
            .sort({ score: -1, timeTaken: 1 })
            .lean();

        if (io) {
            io.emit(`leaderboardUpdate_${quizId}`, leaderboardCache[quizId]);
        }
    } catch (err) {
        console.error(`Error refreshing leaderboard cache for ${quizId}:`, err);
    }
};

export const joinQuiz = async (req, res) => {
    try {
        const { name, email } = req.body;
        const { quizId } = req.params;

        if (!quizId) return res.status(400).json({ error: "quizId is required" });

        // Check if exactly this email already exists in THIS quiz to prevent duplicate runs
        let p = await Participant.findOne({ email, quizId });
        if (!p) {
            p = new Participant({ name, email, quizId });
            await p.save();
        }

        // Just return the id
        res.json({ participantId: p._id, quizId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const submitQuiz = async (req, res) => {
    try {
        const { participantId, score, timeTaken } = req.body;
        const { quizId } = req.params;

        if (!quizId) return res.status(400).json({ error: "quizId is required" });

        const p = await Participant.findById(participantId);
        if (!p) return res.status(404).json({ error: "Participant not found" });

        // Ensure submission matches the right quiz instance
        if (p.quizId !== quizId) {
            return res.status(400).json({ error: "Participant belongs to a different quiz" });
        }

        // Only allow submitting once
        if (p.score !== 0 || p.timeTaken > 0) {
            return res.status(400).json({ error: "Quiz already submitted" });
        }

        p.score = score;
        p.timeTaken = timeTaken;
        p.submittedAt = Date.now();
        await p.save();

        // Trigger cache refresh
        const io = req.app.get('io');
        await refreshLeaderboard(io, quizId);

        res.json({ success: true, message: "Score submitted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        const { quizId } = req.params;
        if (!quizId) return res.status(400).json({ error: "quizId is required" });

        // Initialize cache if this particular quiz is empty
        if (!leaderboardCache[quizId] || leaderboardCache[quizId].length === 0) {
            await refreshLeaderboard(null, quizId);
        }
        res.json(leaderboardCache[quizId] || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;
        const mongoose = await import('mongoose');
        const Question = mongoose.model('Question');

        let qList = await Question.find({ quizId }).lean();

        if (qList.length === 0) {
            // Fallback to static JSON file if DB is empty for this quiz
            const fs = await import('fs');
            const path = await import('path');
            const dataPath = path.join(path.resolve(), '..', 'src', 'assets', `${quizId}.json`);
            if (fs.existsSync(dataPath)) {
                const raw = fs.readFileSync(dataPath, 'utf8');
                qList = JSON.parse(raw);
            }
        } else {
            // Map the DB `correctAnswer` to `answer` for frontend compatibility
            qList = qList.map(q => ({
                id: q._id,
                question: q.question,
                options: q.options,
                answer: q.correctAnswer
            }));
        }

        // Return standard array format
        res.json(qList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Extremely simple admin command trigger endpoint
// Security Note: In production, add auth middleware here.
// --- MENTEE QUIZ STATE (In-memory for live event) ---
let menteeState = {
    activeQuestionIndex: 0,
    isRevealed: false,
    votes: { A: 0, B: 0, C: 0, D: 0 },
    isActive: false,
    standby: false,
    questionStartTime: 0,
    votedParticipants: {}
};

export const getMenteeState = (req, res) => {
    res.json(menteeState);
};

export const triggerAdminEvent = (req, res) => {
    const { event } = req.body;
    if (!event) return res.status(400).json({ error: "No event specified" });

    const io = req.app.get('io');
    if (!io) return res.status(500).json({ error: "Socket IO not initialized" });

    // Handle Mentee Logic if event matches
    if (event === 'openMenteeQuiz') {
        menteeState.standby = true;
        menteeState.isActive = false;
        io.emit('openMenteeQuiz');
        io.emit('mentee_state_sync', menteeState);
    } else if (event === 'startMenteeQuiz') {
        menteeState = {
            activeQuestionIndex: 0,
            isRevealed: false,
            votes: { A: 0, B: 0, C: 0, D: 0 },
            isActive: true,
            standby: false,
            questionStartTime: Date.now(),
            votedParticipants: {}
        };
        io.emit('startMenteeQuiz', menteeState);
    } else if (event === 'nextMenteeQuestion') {
        const MAX_QUESTIONS = 12; // Hardcoded count from mentee_questions.json
        if (menteeState.activeQuestionIndex < MAX_QUESTIONS - 1) {
            menteeState.activeQuestionIndex++;
            menteeState.isRevealed = false;
            menteeState.votes = { A: 0, B: 0, C: 0, D: 0 };
            menteeState.questionStartTime = Date.now();
            menteeState.votedParticipants = {};
            io.emit('nextMenteeQuestion', menteeState);
        } else {
            menteeState.isActive = false;
            menteeState.standby = false;
            io.emit('endMenteeQuiz');
        }
    } else if (event === 'revealMenteeAnswer') {
        menteeState.isRevealed = true;
        io.emit('revealMenteeAnswer', menteeState);

        // Calculate scores asynchronously
        setTimeout(async () => {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const menteeQuestionsPath = path.join(path.resolve(), '..', 'src', 'assets', 'mentee_questions.json');
                const rawQs = fs.readFileSync(menteeQuestionsPath, 'utf8');
                const menteeQs = JSON.parse(rawQs);
                const currentQ = menteeQs[menteeState.activeQuestionIndex];
                const correctChar = String.fromCharCode(65 + currentQ.answer);

                for (const [pId, voteData] of Object.entries(menteeState.votedParticipants)) {
                    if (voteData.option === correctChar) {
                        const scorePoints = Math.max(10, 1000 - (voteData.timeTaken * 40));
                        await Participant.findByIdAndUpdate(pId, {
                            $inc: { score: scorePoints, timeTaken: voteData.timeTaken }
                        });
                    } else {
                        await Participant.findByIdAndUpdate(pId, {
                            $inc: { timeTaken: voteData.timeTaken }
                        });
                    }
                }

                // Refresh leaderboard cache
                const appIo = req.app.get('io');
                await refreshLeaderboard(appIo, 'mentee');
            } catch (err) {
                console.error("Error calculating mentee scores:", err);
            }
        }, 0);
    } else if (event === 'endMenteeQuiz') {
        menteeState.isActive = false;
        menteeState.standby = false;
        io.emit('endMenteeQuiz');
        io.emit('mentee_state_sync', menteeState);
    } else {
        // Generic event pass-through
        io.emit(event);
    }

    res.json({ success: true, event, state: menteeState });
};

// Export for socket use
export const handleMenteeVote = (io, data) => {
    if (!menteeState.isActive || menteeState.isRevealed) return;

    let option, participantId;
    if (typeof data === 'string') {
        option = data;
    } else {
        option = data.option;
        participantId = data.participantId;
    }

    if (!menteeState.votes.hasOwnProperty(option)) return;

    if (participantId) {
        if (menteeState.votedParticipants[participantId]) return; // Prevent double voting
        const timeTaken = Math.floor((Date.now() - menteeState.questionStartTime) / 1000);
        menteeState.votedParticipants[participantId] = { option, timeTaken };
    }

    menteeState.votes[option]++;
    io.emit('voteUpdate', menteeState.votes);
};

export const syncMenteeState = (socket) => {
    socket.emit('mentee_state_sync', menteeState);
};

// --- FINAL RESULTS LOGIC ---

export const getFinalResults = async (req, res) => {
    try {
        if (finalResultsCache.length === 0) {
            finalResultsCache = await FinalResult.find().sort({ position: 1 }).lean();
        }
        res.json(finalResultsCache);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addFinalResult = async (req, res) => {
    try {
        const { teamName, members, position } = req.body;

        // Upsert or create new
        await FinalResult.findOneAndUpdate(
            { position },
            { teamName, members, position, createdAt: Date.now() },
            { upsert: true, returnDocument: 'after' }
        );

        // Refresh cache
        finalResultsCache = await FinalResult.find().sort({ position: 1 }).lean();

        res.json({ success: true, result: finalResultsCache });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteFinalResult = async (req, res) => {
    try {
        const { id } = req.params;
        await FinalResult.findByIdAndDelete(id);

        // Refresh cache
        finalResultsCache = await FinalResult.find().sort({ position: 1 }).lean();

        res.json({ success: true, result: finalResultsCache });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
