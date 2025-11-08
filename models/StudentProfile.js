/* models/StudentProfile.js */
const mongoose = require('mongoose');

const StudentProfileSchema = new mongoose.Schema({
    // This links the profile to a user in the 'users' collection
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // --- UPDATED/NEW FIELDS ---
    firstName: {
        type: String,
        required: true
    },
    surname: {
        type: String,
    },
    // This is the registered email (from the User model)
    email: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
    },
    personalEmail: {
        type: String,
    },
    isWhatsappSame: {
        type: Boolean,
        default: false,
    },
    whatsappNumber: {
        type: String,
    },
    // --- END UPDATED/NEW FIELDS ---

    // --- *** THIS IS THE UPDATED FIELD *** ---
    photo: {
        type: String, // URL to the photo
        default: 'https://res.cloudinary.com/dbsovavaw/image/upload/v1762574486/08350cafa4fabb8a6a1be2d9f18f2d88_kqvnyw.jpg'
    },
    // --- *** END OF UPDATE *** ---

    familyIncome: {
        type: Number
    },
    certificates: [
        {
            title: String,
            url: String // URL to the certificate file
        }
    ],
    marks: {
        type: String
    },

    // --- NEW FIELD FOR ENROLLMENT ---
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }]
    // --- END NEW FIELD ---
});

module.exports = mongoose.model('StudentProfile', StudentProfileSchema);