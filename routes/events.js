/* routes/events.js */
const express = require('express');
const router = express.Router();
const { auth, facultyAndAdminAuth } = require('../middleware/auth');
const Event = require('../models/Event');

// --- @route   GET api/events (Any User) ---
// (This route is unchanged)
router.get('/', auth, async (req, res) => {
    try {
        let events;
        if (req.user.role === 'admin' || req.user.role === 'faculty') {
            // Admin/Faculty get ALL events
            events = await Event.find().sort({ date: -1 });
        } else {
            // Student only gets UPCOMING events
            events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 });
        }
        res.json(events);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- *** NEW ROUTE: GET api/events/:id *** ---
// --- @desc    Get a single event by its ID
// --- @access  Private (Admin/Faculty)
router.get('/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
        }
        res.json(event);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Event not found' });
        }
        res.status(500).send('Server Error');
    }
});


// --- @route   POST api/events (Admin or Faculty) ---
// (This route is unchanged)
router.post('/', facultyAndAdminAuth, async (req, res) => {
    try {
        const { title, description, date } = req.body;
        const newEvent = new Event({
            title,
            description,
            date,
        });
        const event = await newEvent.save();
        res.json(event);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- *** NEW ROUTE: PUT api/events/:id *** ---
// --- @desc    Update an existing event
// --- @access  Private (Admin/Faculty)
router.put('/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        const { title, description, date } = req.body;
        const eventFields = {};
        if (title) eventFields.title = title;
        if (description) eventFields.description = description;
        if (date) eventFields.date = date;

        let event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
        }

        event = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: eventFields },
            { new: true }
        );
        res.json(event);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- @route   DELETE api/events/:id (Admin or Faculty) ---
// (This route is unchanged)
router.delete('/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ msg: 'Event not found' });
        }

        await Event.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Event removed' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Event not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;