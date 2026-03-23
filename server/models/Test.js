const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    testName: { type: String, required: true },
    examType: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    allowedTools: { type: [String], required: true },
    isOpenBook: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    questions: { type: [String], required: true },
    createdDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Test', testSchema);