const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    collegeName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    studentId: {
        type: String,
        required: true,
        unique: true
    }
});

module.exports = mongoose.model('Student', studentSchema);