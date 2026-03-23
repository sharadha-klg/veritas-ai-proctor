const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    testId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    questionType: {
        type: String,
        enum: ['MCQ', 'Coding', 'Essay'],
        required: true
    },
    questionText: {
        type: String,
        required: true
    },
    options: {
        type: [String], // For MCQ
        required: function () { return this.questionType === 'MCQ'; } 
    },
    correctAnswer: {
        type: String, // Can be a string for MCQ or any relevant format for Coding and Essay
        required: true
    },
    marks: {
        type: Number,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    updatedDate: {
        type: Date,
        default: Date.now
    }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;