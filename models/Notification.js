const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    // This could be 'all' or a specific user ID
    recipient: { 
        type: String,
        default: 'all',
    },
});

module.exports = mongoose.model('Notification', NotificationSchema);