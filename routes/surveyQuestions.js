/* routes/surveyQuestions.js (NEW FILE) */
const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const SurveyQuestion = require('../models/SurveyQuestion');

// --- @route   GET api/survey-questions/random ---
// --- @desc    Get 5 random survey questions
// --- @access  Private (Student-Only)
router.get('/random', auth, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ msg: 'Access Denied' });
    }
    try {
        // This fetches 5 random documents from the collection
        const questions = await SurveyQuestion.aggregate([
            { $sample: { size: 5 } }
        ]);
        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   POST api/survey-questions/seed ---
// --- @desc    (HELPER) Add default questions to the bank
// --- @access  Private (Admin-Only)
router.post('/seed', adminAuth, async (req, res) => {
    try {
        const defaultQuestions = [
            {
                text: "How well did you sleep last night?",
                answers: [
                    { text: "Very Well", score: 5 },
                    { text: "Okay", score: 3 },
                    { text: "Poorly", score: 1 }
                ]
            },
            {
                text: "Are you feeling on top of your coursework?",
                answers: [
                    { text: "Yes, completely", score: 5 },
                    { text: "Mostly", score: 4 },
                    { text: "I'm struggling a bit", score: 2 },
                    { text: "I'm very behind", score: 1 }
                ]
            },
            {
                text: "Have you been able to eat properly?",
                answers: [
                    { text: "Yes, all my meals", score: 5 },
                    { text: "Mostly, but skipping some", score: 3 },
                    { text: "No, not really", score: 1 }
                ]
            },
            {
                text: "How connected do you feel to your classmates?",
                answers: [
                    { text: "Very connected", score: 5 },
                    { text: "Somewhat connected", score: 3 },
                    { text: "A little isolated", score: 2 },
                    { text: "Very isolated", score: 1 }
                ]
            },
            {
                text: "Are you feeling optimistic about the week?",
                answers: [
                    { text: "Very optimistic", score: 5 },
                    { text: "Slightly optimistic", score: 4 },
                    { text: "Neutral", score: 3 },
                    { text: "Not really", score: 2 }
                ]
            },
            {
                text: "Are you worried about exams or deadlines?",
                answers: [
                    { text: "No, I feel prepared", score: 5 },
                    { text: "A little", score: 3 },
                    { text: "Yes, very worried", score: 1 }
                ]
            },
            {
                text: "Have you had time for hobbies or relaxation?",
                answers: [
                    { text: "Yes, plenty", score: 5 },
                    { text: "A little bit", score: 3 },
                    { text: "None at all", score: 1 }
                ]
            }
        ];

        await SurveyQuestion.deleteMany({}); // Clear existing questions
        await SurveyQuestion.insertMany(defaultQuestions);
        
        res.status(201).json({ msg: 'Survey question bank has been seeded!' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;