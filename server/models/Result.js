const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },
  testId: {
    type: String,
    required: true,
  },
  marksObtained: {
    type: Number,
    required: true,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  riskScore: {
    type: Number,
    required: true,
  },
  AIalerts: {
    type: [String],
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);