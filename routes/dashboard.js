/* routes/dashboard.js (NEW FILE) */
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const SurveyResponse = require('../models/SurveyResponse');

// --- @route   GET api/dashboard/admin-stats ---
// --- @desc    Get high-level stats for the admin dashboard
// --- @access  Private (Admin-Only)
router.get('/admin-stats', adminAuth, async (req, res) => {
    try {
        // Run all database queries in parallel for speed
        const [
            pendingStudents,
            pendingFaculty,
            pendingAdmins,
            activeStudents,
            activeFaculty,
            recentSurveys
        ] = await Promise.all([
            User.countDocuments({ role: 'student', status: 'pending' }),
            User.countDocuments({ role: 'faculty', status: 'pending' }),
            User.countDocuments({ role: 'admin', status: 'pending' }),
            StudentProfile.countDocuments({}), // A good proxy for active students
            User.countDocuments({ role: 'faculty', status: 'active' }),
            SurveyResponse.find({ mood: { $in: ['Stressed', 'Sad'] } }) // Find "at-risk"
                .sort({ date: -1 }) // Get newest first
                .limit(5) // Only get the 5 most recent
                .populate('student', 'name') // Get the student's name
        ]);

        // Send all data back in one object
        res.json({
            pendingStudents,
            pendingFaculty,
            pendingAdmins,
            activeStudents,
            activeFaculty,
            recentSurveys
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;