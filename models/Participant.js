import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    score: {
        type: Number,
        default: 0
    },
    timeTaken: {
        type: Number,
        default: 0
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    quizId: {
        type: String,
        required: true,
        index: true
    }
});

// Compound index for Leaderboard sorting per quiz: quizId, score DESC, timeTaken ASC
participantSchema.index({ quizId: 1, score: -1, timeTaken: 1 });

const Participant = mongoose.model('Participant', participantSchema);

export default Participant;
