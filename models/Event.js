const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    // We can add 'location', 'organizer' etc. later
});

module.exports = mongoose.model('Event', EventSchema);