/* routes/upload.js (NEW FILE) */
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { auth } = require('../middleware/auth'); // Use your existing auth
require('dotenv').config(); // Ensure .env variables are loaded

// --- CONFIGURE CLOUDINARY ---
// (These MUST be in your backend .env file!)
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// --- @route   GET api/upload/signature ---
// --- @desc    Get a secure signature for uploading to Cloudinary
// --- @access  Private
router.get('/signature', auth, (req, res) => {
    try {
        // This creates a timestamp and a signature
        const timestamp = Math.round((new Date).getTime() / 1000);
        
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: 'student_profiles' // A folder to store images in
            }, 
            process.env.CLOUDINARY_API_SECRET
        );
        
        res.json({ 
            timestamp: timestamp, 
            signature: signature,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;