/* routes/courses.js */
const express = require('express');
const router = express.Router();
// --- (Imports are unchanged) ---
const { auth, adminAuth, facultyAuth, facultyAndAdminAuth } = require('../middleware/auth');
const Course = require('../models/Course');

// --- @route   GET api/courses (Any User) ---
// (This route is unchanged)
router.get('/', auth, async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('faculty', 'name')
            .sort({ code: 1 });
        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/courses/my-courses ---
// --- @desc    Get courses for the logged-in faculty
// --- @access  Private (Admin or Faculty) ---
// --- UPDATED: Changed middleware to facultyAndAdminAuth ---
router.get('/my-courses', facultyAndAdminAuth, async (req, res) => {
    try {
        let courses = []; // Default to an empty list
        
        // --- NEW: Only fetch courses if the user is faculty ---
        if (req.user.role === 'faculty') {
            courses = await Course.find({ faculty: req.user.id })
                .populate('faculty', 'name')
                .sort({ code: 1 });
        }
        
        // If user is admin, this just returns an empty list, which is correct
        res.json(courses); 
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// --- END OF UPDATE ---


// --- @route   GET api/courses/:id (Admin or Faculty) ---
// (This route is unchanged)
router.get('/:id', facultyAndAdminAuth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('faculty', 'name');
            
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Course not found' });
        }
        res.status(500).send('Server Error');
    }
});


// --- @route   POST api/courses (Admin-Only) ---
// (This route is unchanged)
router.post('/', adminAuth, async (req, res) => {
    try {
        const { code, title, description, syllabusUrl, timetableUrl, faculty } = req.body;
        
        let course = await Course.findOne({ code });
        if (course) {
            return res.status(400).json({ msg: 'Course with this code already exists' });
        }
        const newCourse = new Course({
            code, title, description, syllabusUrl, timetableUrl,
            faculty: faculty || null
        });
        course = await newCourse.save();
        res.json(course);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   PUT api/courses/:id (Admin-Only) ---
// (This route is unchanged)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { code, title, description, syllabusUrl, timetableUrl, faculty } = req.body;
        
        const courseFields = {};
        if (code) courseFields.code = code;
        if (title) courseFields.title = title;
        if (description) courseFields.description = description;
        if (syllabusUrl !== undefined) courseFields.syllabusUrl = syllabusUrl;
        if (timetableUrl !== undefined) courseFields.timetableUrl = timetableUrl;
        if (faculty !== undefined) {
            courseFields.faculty = faculty || null;
        }

        let course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        if (code && code !== course.code) {
            let existing = await Course.findOne({ code });
            if (existing) {
                return res.status(400).json({ msg: 'Course with this code already exists' });
            }
        }
        course = await Course.findByIdAndUpdate(
            req.params.id,
            { $set: courseFields },
            { new: true }
        );
        res.json(course);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- @route   DELETE api/courses/:id (Admin-Only) ---
// (This route is unchanged)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        let course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Course not found' });
        }
        await Course.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Course removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Course not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;