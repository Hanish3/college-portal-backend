/* models/Grade.js */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GradeSchema = new Schema({
    // Link to the student
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Link to the course
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    // Title of the assessment (e.g., "Midterm", "Final Exam", "Overall Grade")
    assessmentTitle: {
        type: String,
        required: true,
        trim: true,
        default: 'Overall Grade'
    },
    // The marks the student received
    marksObtained: {
        type: Number,
        required: true,
        default: 0
    },
    // The total possible marks for this assessment
    totalMarks: {
        type: Number,
        required: true,
        default: 100
    },
    // Who entered this grade
    markedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User' // This would be a faculty/admin ID
    }
});

// This index prevents a student from having two "Overall Grade" entries
// for the same course.
GradeSchema.index({ student: 1, course: 1, assessmentTitle: 1 }, { unique: true });

module.exports = mongoose.model('Grade', GradeSchema);