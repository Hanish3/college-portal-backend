/* middleware/auth.js */
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // <-- 1. IMPORT USER MODEL

// This guard checks if you are *any* logged-in user
// --- 2. MAKE THE FUNCTION ASYNC ---
const auth = async (req, res, next) => {
    // 1. Get token from the request header
    const token = req.header('x-auth-token');

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 3. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // --- 4. NEW: CHECK USER STATUS FROM DATABASE ---
        const user = await User.findById(decoded.user.id).select('-password');

        if (!user) {
            return res.status(401).json({ msg: 'Token is not valid, user not found' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ msg: 'Your account is suspended.' });
        }
        
        if (user.status === 'pending') {
            return res.status(403).json({ msg: 'Your account is pending approval.' });
        }
        // --- END NEW CHECK ---

        // 5. Add user to request and continue
        req.user = user; // <-- We now pass the full user object (minus password)
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// --- THIS GUARD IS NOW STRICTLY ADMIN-ONLY ---
const adminAuth = (req, res, next) => {
    // We use 'await' here because the auth middleware is now async
    auth(req, res, () => {
        if (req.user.role === 'admin') {
            next(); 
        } else {
            return res.status(403).json({ msg: 'Access denied: Admin only' });
        }
    });
};

// --- THIS GUARD IS STRICTLY FACULTY-ONLY ---
const facultyAuth = (req, res, next) => {
    auth(req, res, () => {
        if (req.user.role === 'faculty') {
            next();
        } else {
            return res.status(403).json({ msg: 'Access denied: Faculty only' });
        }
    });
};

// --- THIS IS THE NEW GUARD YOU ARE MISSING ---
const facultyAndAdminAuth = (req, res, next) => {
    auth(req, res, () => {
        if (req.user.role === 'admin' || req.user.role === 'faculty') {
            next();
        } else {
            return res.status(403).json({ msg: 'Access denied: Admin/Faculty only' });
        }
    });
};
// --- END NEW GUARD ---

// --- UPDATED EXPORTS ---
module.exports = { auth, adminAuth, facultyAuth, facultyAndAdminAuth };