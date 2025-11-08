const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
    // Link to the student
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User', // This links to your User model
        required: true
    },
    // Link to the course
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course', // This links to your Course model
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Late'], // Only these values are allowed
        required: true
    },
    // Optional: We can add who marked the attendance
    markedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User' // This would be an admin/faculty ID
    }
});

// This is important: It prevents creating a duplicate entry for the
// same student, in the same course, on the same day.
AttendanceSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);