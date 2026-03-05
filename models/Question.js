import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    quizId: {
        type: String,
        required: true,
        index: true
    },
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctAnswer: {
        type: Number,
        required: true
    }
});

const Question = mongoose.model('Question', questionSchema);

export default Question;
