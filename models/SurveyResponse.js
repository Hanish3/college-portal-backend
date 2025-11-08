/* models/SurveyResponse.js */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SurveyResponseSchema = new Schema({
    // Link to the student who submitted
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // This is the FINAL mood, calculated from the score
    mood: {
        type: String,
        enum: ['Great', 'Good', 'Okay', 'Stressed', 'Sad'],
        required: true
    },
    // This is the total score from all answers
    totalScore: {
        type: Number,
        required: true
    },
    // This stores a copy of the actual questions and answers given
    responses: [
        {
            questionText: String,
            answerText: String,
            score: Number
        }
    ],
    // Optional comments
    comments: {
        type: String,
        trim: true
    },
    // The date of the submission
    date: {
        type: Date,
        required: true
    }
});

// This is a compound index. It prevents a student from
// submitting more than one survey response for the same date.
SurveyResponseSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SurveyResponse', SurveyResponseSchema);