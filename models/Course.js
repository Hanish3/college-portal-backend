/* models/Course.js */
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    syllabusUrl: {
        type: String,
        default: ''
    },
    timetableUrl: {
        type: String,
        default: ''
    },
    
    // --- NEW FIELD ---
    // This links to the User model (who must have role 'faculty')
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional, can be unassigned
    }
    // --- END NEW FIELD ---
});

module.exports = mongoose.model('Course', CourseSchema);