/* routes/notifications.js */
const express = require('express');
const router = express.Router();
// --- UPDATED: Import the correct guards ---
const { auth, facultyAndAdminAuth } = require('../middleware/auth');
const Notification = require('../models/Notification');

// --- @route   GET api/notifications (Any User) ---
// (This route is correct, uses 'auth' and has internal role logic)
router.get('/', auth, async (req, res) => {
    try {
        let notifications;
        if (req.user.role === 'admin' || req.user.role === 'faculty') {
            notifications = await Notification.find().sort({ date: -1 });
        } else {
            // Student only gets theirs and 'all'
            notifications = await Notification.find({
                recipient: { $in: ['all', req.user.id] }
            }).sort({ date: -1 });
        }
        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   POST api/notifications (Admin or Faculty) ---
// --- UPDATED: Now uses 'facultyAndAdminAuth' ---
router.post('/', facultyAndAdminAuth, async (req, res) => {
    try {
        const { title, message, recipient } = req.body;
        const newNotification = new Notification({
            title,
            message,
            recipient,
        });
        const notification = await newNotification.save();
        res.json(notification);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   DELETE api/notifications/:id (Admin or Faculty) ---
// --- UPDATED: Now uses 'facultyAndAdminAuth' ---
router.delete('/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        await Notification.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Notification removed' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Notification not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
