/* routes/users.js */
const express = require('express');
const router = express.Router();
const { adminAuth, facultyAndAdminAuth } = require('../middleware/auth');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');

// --- (All routes from GET /pending/students to DELETE /reject/:id are correct and unchanged) ---
// --- @route   GET api/users/pending/students (Admin or Faculty) ---
router.get('/pending/students', facultyAndAdminAuth, async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending', role: 'student' })
                                       .select('-password')
                                       .sort({ _id: -1 });
        res.json(pendingUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/users/pending/faculty (Admin-Only) ---
router.get('/pending/faculty', adminAuth, async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending', role: 'faculty' })
                                       .select('-password')
                                       .sort({ _id: -1 });
        res.json(pendingUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/users/pending/admins (Admin-Only) ---
router.get('/pending/admins', adminAuth, async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending', role: 'admin' })
                                       .select('-password')
                                       .sort({ _id: -1 });
        res.json(pendingUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/users/active (Admin-Only) ---
router.get('/active', adminAuth, async (req, res) => {
    try {
        const activeUsers = await User.find({ 
            status: 'active',
            role: { $in: ['student', 'faculty'] } 
        })
        .select('-password')
        .sort({ role: 1, name: 1 });
        res.json(activeUsers);
    } catch (err) { res.status(500).send('Server Error'); }
});

// --- @route   GET api/users/suspended (Admin-Only) ---
router.get('/suspended', adminAuth, async (req, res) => {
    try {
        const suspendedUsers = await User.find({ status: 'suspended' })
                                         .select('-password')
                                         .sort({ name: 1 });
        res.json(suspendedUsers);
    } catch (err) { res.status(500).send('Server Error'); }
});

// --- @route   PUT api/users/approve/:id (Admin or Faculty) ---
router.put('/approve/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // --- CORRECT SECURITY CHECK ---
        // Block faculty from approving anyone who is NOT a student
        if (user.role !== 'student' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access Denied: Faculty can only approve students.' });
        }
        // --- END CHECK ---

        user.status = 'active';
        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        res.json({ msg: 'User approved', user: userResponse });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   DELETE api/users/reject/:id (Admin or Faculty) ---
router.delete('/reject/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.status !== 'pending') return res.status(400).json({ msg: 'Cannot reject an active user' });

        // --- CORRECT SECURITY CHECK ---
        // Block faculty from rejecting anyone who is NOT a student
        if (user.role !== 'student' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access Denied: Faculty can only reject students.' });
        }
        // --- END CHECK ---

        if (user.role === 'student') {
            await StudentProfile.findOneAndDelete({ user: user.id });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User rejected and deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/users/faculty (Admin-Only) ---
router.get('/faculty', adminAuth, async (req, res) => {
    try {
        const faculty = await User.find({ role: 'faculty', status: 'active' })
                                  .select('_id name')
                                  .sort({ name: 1 });
        res.json(faculty);
    } catch (err) { res.status(500).send('Server Error'); }
});

// --- @route   PUT api/users/suspend/:id (Admin-Only) ---
// --- *** THIS ROUTE IS NOW FIXED *** ---
router.put('/suspend/:id', adminAuth, async (req, res) => {
    // --- 1. Get the dates from the request body ---
    const { startDate, endDate } = req.body;

    // --- 2. Validate the dates ---
    if (!startDate || !endDate) {
        return res.status(400).json({ msg: 'Suspension start and end dates are required.' });
    }
    if (new Date(endDate) <= new Date(startDate)) {
        return res.status(400).json({ msg: 'End date must be after start date.' });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ msg: 'Cannot suspend an admin account' });
        
        // --- 3. Save the dates to the user model ---
        user.status = 'suspended';
        user.suspensionStartDate = new Date(startDate);
        user.suspensionEndDate = new Date(endDate);
        // --- End of fix ---

        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        res.json({ msg: 'User suspended', user: userResponse });
    } catch (err) { res.status(500).send('Server Error'); }
});
// --- *** END OF FIXED ROUTE *** ---


// --- @route   PUT api/users/reactivate/:id (Admin-Only) ---
// --- *** THIS ROUTE IS ALSO UPDATED TO CLEAR DATES *** ---
router.put('/reactivate/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.status !== 'suspended') return res.status(400).json({ msg: 'User is not suspended' });
        
        // --- 1. Clear suspension dates ---
        user.status = 'active';
        user.suspensionStartDate = null;
        user.suspensionEndDate = null;
        // --- End of fix ---

        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        res.json({ msg: 'User reactivated', user: userResponse });
    } catch (err) { res.status(500).send('Server Error'); }
});
// --- *** END OF UPDATED ROUTE *** ---


// --- @route   DELETE api/users/:id (Admin-Only) ---
// --- (This route is unchanged) ---
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ msg: 'Cannot delete an admin account' });
        if (user.role === 'student') {
            await StudentProfile.findOneAndDelete({ user: user.id });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User has been permanently deleted.' });
    } catch (err) { res.status(500).send('Server Error'); }
});

module.exports = router;