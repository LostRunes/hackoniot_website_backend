import mongoose from 'mongoose';

const finalResultSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true,
        trim: true
    },
    members: [{
        type: String,
        required: true,
        trim: true
    }],
    position: {
        type: Number,
        required: true,
        unique: true // Ensuring only one team per position
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Duplicate index removed due to unique schema definition

const FinalResult = mongoose.model('FinalResult', finalResultSchema);

export default FinalResult;
