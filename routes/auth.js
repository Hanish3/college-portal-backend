/* routes/auth.js */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// --- 1. IMPORT ALL THE MODELS TO DELETE ---
const User = require('../models/User'); 
const StudentProfile = require('../models/StudentProfile');
const Attendance = require('../models/Attendance');

// --- (The '/register' route is unchanged) ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (role === 'admin') {
            return res.status(400).json({ msg: 'Admin accounts cannot be created from this page.' });
        }
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User({
            name, email, password,
            role: role || 'student', 
            status: 'pending'
        });
        await user.save();
        if (user.role === 'student') {
            const nameParts = user.name.split(' ');
            const firstName = nameParts.shift(); 
            const surname = nameParts.join(' '); 
            const profile = new StudentProfile({
                user: user.id,
                email: user.email,
                firstName: firstName, 
                surname: surname,   
            });
            await profile.save();
        }
        res.status(201).json({ msg: 'Registration successful! Your account is pending approval.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- (The '/setup-first-admin' route is unchanged) ---
router.post('/setup-first-admin', async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(403).json({ msg: 'An admin account already exists. This route is disabled.' });
        }
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Please provide name, email, and password.' });
        }
        const user = new User({
            name, email, password,
            role: 'admin',
            status: 'active'
        });
        await user.save();
        res.status(201).json({ msg: 'First admin account created successfully. You can now log in.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- (The '/login' route is unchanged) ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        if (user.status === 'pending') {
            return res.status(401).json({ msg: 'Your account is pending approval.' });
        }
        if (user.status === 'suspended') {
            return res.status(401).json({ msg: 'Your account has been suspended.' });
        }
        const payload = {
            user: { id: user.id, role: user.role },
        };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' }, 
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- 2. ADD THIS NEW SECRET WIPE ROUTE ---
// --- @route   DELETE api/auth/DANGEROUS-WIPE-ALL-USERS ---
// --- @desc    Deletes all users, profiles, and attendance.
// --- @access  PUBLIC (Temporary) ---
router.delete('/DANGEROUS-WIPE-ALL-USERS', async (req, res) => {
    try {
        await User.deleteMany({});
        await StudentProfile.deleteMany({});
        await Attendance.deleteMany({});
        
        res.status(200).json({ msg: 'SUCCESS: All users, student profiles, and attendance records have been deleted.' });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not wipe database.');
    }
});
// --- END OF NEW ROUTE ---

module.exports = router;