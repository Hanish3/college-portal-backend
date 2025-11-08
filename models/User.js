/* models/User.js */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, // No two users can have the same email
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'faculty', 'admin'], // Only these values are allowed
        default: 'student',
    },
    
    // --- UPDATED FIELD ---
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'], // <-- 'suspended' IS NEW
        default: 'pending' 
    },
    // --- END UPDATED FIELD ---

    // --- NEW FIELDS FOR TIMED SUSPENSION ---
    suspensionStartDate: {
        type: Date,
        default: null
    },
    suspensionEndDate: {
        type: Date,
        default: null
    }
    // --- END NEW FIELDS ---
});

// This function runs *before* a user is saved to the database
// We use it to HASH the password
UserSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    // Generate a "salt" to make the hash secure
    const salt = await bcrypt.genSalt(10);
    // Re-assign the user's password to the new hashed version
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);