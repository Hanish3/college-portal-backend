/* models/SurveyQuestion.js (NEW FILE) */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SurveyQuestionSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    // This array holds the possible answers and their scores
    // A higher score means a more positive mood
    answers: [
        {
            text: { type: String, required: true },
            score: { type: Number, required: true, min: 1, max: 5 }
        }
    ]
});

module.exports = mongoose.model('SurveyQuestion', SurveyQuestionSchema);