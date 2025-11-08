/* routes/survey.js */
const express = require('express');
const router = express.Router();
const { auth, facultyAndAdminAuth } = require('../middleware/auth');
const SurveyResponse = require('../models/SurveyResponse');
const User = require('../models/User'); 

// --- @route   POST api/survey ---
// --- @desc    Student submits their daily mood survey (NEW VERSION)
// --- @access  Private (Student-Only)
router.post('/', auth, async (req, res) => {
    // Only students can submit
    if (req.user.role !== 'student') {
        return res.status(403).json({ msg: 'Access Denied: Only students can submit surveys.' });
    }

    const { responses, comments } = req.body;
    // 'responses' is expected to be:
    // [ { questionText: "...", answerText: "...", score: 3 }, ... ]

    if (!Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ msg: 'Invalid survey data.' });
    }

    // Create a date for "today" at midnight.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // --- 1. Calculate the final score and mood ---
        let totalScore = 0;
        let maxScore = 0;
        responses.forEach(r => {
            totalScore += r.score;
            maxScore += 5; // Assuming 5 is the max score for any question
        });
        
        const percentage = (totalScore / maxScore) * 100;

        let mood;
        if (percentage >= 80) {
            mood = 'Great';
        } else if (percentage >= 60) {
            mood = 'Good';
        } else if (percentage >= 40) {
            mood = 'Okay';
        } else if (percentage >= 20) {
            mood = 'Stressed';
        } else {
            mood = 'Sad';
        }
        // --- End of Calculation ---

        const newResponse = new SurveyResponse({
            student: req.user.id,
            mood: mood, // The new calculated mood
            totalScore: totalScore,
            responses: responses, // The detailed answers
            comments,
            date: today
        });

        await newResponse.save();
        res.status(201).json({ msg: 'Thank you for your response!' });

    } catch (err) {
        // This catches the 'unique' index error if they try to submit twice
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'You have already submitted your survey for today.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- @route   GET api/survey/check-today ---
// --- @desc    Check if student has already submitted today
// --- @access  Private (Student-Only)
router.get('/check-today', auth, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ msg: 'Access Denied' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const response = await SurveyResponse.findOne({
            student: req.user.id,
            date: today
        });

        if (response) {
            res.json({ submitted: true });
        } else {
            res.json({ submitted: false });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- @route   GET api/survey/results ---
// --- @desc    Get all survey results
// --- @access  Private (Admin or Faculty)
router.get('/results', facultyAndAdminAuth, async (req, res) => {
    try {
        const results = await SurveyResponse.find()
            .populate('student', 'name') // Get the student's name
            .sort({ date: -1 }); // Show newest first
        
        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;