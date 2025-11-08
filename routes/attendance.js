/* routes/attendance.js */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// --- (Imports are unchanged) ---
const { auth, facultyAndAdminAuth } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Course = require('../models/Course');

// --- @route   POST api/attendance (For single student) ---
// --- (This route is unchanged) ---
router.post('/', facultyAndAdminAuth, async (req, res) => {
    const { studentId, courseId, date, status } = req.body;
    try {
        const student = await User.findById(studentId);
        const course = await Course.findById(courseId);
        if (!student || !course) {
            if (!student) return res.status(404).json({ msg: 'Student not found' });
            if (!course) return res.status(404).json({ msg: 'Course not found' });
        }
        if (student.role !== 'student') {
            return res.status(400).json({ msg: 'This user is not a student' });
        }
        const newAttendance = new Attendance({
            student: studentId,
            course: courseId,
            date,
            status,
            markedBy: req.user.id
        });
        await newAttendance.save();
        res.status(201).json(newAttendance);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Attendance for this student in this course on this date already exists.' });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ msg: `Invalid ID format for ${err.path}` });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        console.error("POST /api/attendance ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});


// --- (All student-facing routes are unchanged) ---

// --- @route   GET api/attendance/me/courses (Student-Only) ---
router.get('/me/courses', auth, async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id); 
        const courses = await Attendance.aggregate([
            { $match: { student: studentId } },
            { $group: { _id: '$course' } },
            { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'courseDetails' } },
            { $unwind: '$courseDetails' },
            { $replaceRoot: { newRoot: '$courseDetails' } },
            { $sort: { code: 1 } }
        ]);
        res.json(courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/attendance/me/stats/:courseId (Student-Only) ---
router.get('/me/stats/:courseId', auth, async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const courseId = new mongoose.Types.ObjectId(req.params.courseId);
        const stats = await Attendance.aggregate([
            // (Aggregation pipeline is unchanged)
            { $match: { student: studentId, course: courseId } },
            { $project: { status: 1, course: 1, year: { $year: "$date" }, month: { $month: "$date" } } },
            { $group: { _id: { course: '$course', year: '$year', month: '$month' }, present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } } } },
            { $addFields: { total: { $add: ['$present', '$absent', '$late'] } } },
            { $addFields: { percentage: { $cond: [ { $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$present', '$total'] }, 100] } ] } } },
            { $lookup: { from: 'courses', localField: '_id.course', foreignField: '_id', as: 'courseDetails' } },
            { $project: { _id: 0, year: '$_id.year', month: '$_id.month', course: { $arrayElemAt: ['$courseDetails', 0] }, present: 1, absent: 1, late: 1, total: 1, percentage: 1 } },
            { $sort: { 'year': -1, 'month': -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/attendance/me/daily/:courseId/:year/:month (Student-Only) ---
router.get('/me/daily/:courseId/:year/:month', auth, async (req, res) => {
    try {
        const { courseId, year, month } = req.params;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        const records = await Attendance.find({
            student: req.user.id,
            course: courseId,
            date: { $gte: startDate, $lt: endDate }
        }).sort({ date: 1 }); 
        res.json(records);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- THIS IS THE NEW BATCH ROUTE ---
// --- @route   POST api/attendance/batch ---
// --- @desc    Submit attendance for multiple students at once
// --- @access  Private (Admin or Faculty) ---
router.post('/batch', facultyAndAdminAuth, async (req, res) => {
    const { courseId, date, attendanceData } = req.body;
    // attendanceData is expected to be:
    // [ { studentId: "...", status: "Present" }, { studentId: "...", status: "Absent" } ]

    if (!courseId || !date || !Array.isArray(attendanceData)) {
        return res.status(400).json({ msg: 'Invalid data format.' });
    }

    try {
        const markedBy = req.user.id;
        let successfulRecords = 0;
        let failedRecords = 0;
        let errors = [];

        // We use 'Promise.allSettled' to try and insert all records,
        // even if some fail (e.g., duplicates)
        const operations = attendanceData.map(record => ({
            updateOne: {
                // 'filter' finds the doc to update or create
                filter: { 
                    student: record.studentId, 
                    course: courseId, 
                    date: new Date(date) 
                },
                // 'update' sets the data
                update: { 
                    $set: {
                        status: record.status,
                        markedBy: markedBy
                    }
                },
                // 'upsert: true' creates the doc if it doesn't exist
                upsert: true 
            }
        }));

        // 'bulkWrite' is a high-performance way to do many operations
        const result = await Attendance.bulkWrite(operations);

        successfulRecords = result.upsertedCount + result.modifiedCount;
        
        res.status(201).json({ 
            msg: `Attendance submitted. ${successfulRecords} records saved.`,
            successCount: successfulRecords,
        });

    } catch (err) {
        console.error("Batch Attendance Error:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});
// --- END OF NEW BATCH ROUTE ---

// --- *** NEW ROUTE FOR STUDENT SELF-CHECK-IN *** ---
// --- @route   POST api/attendance/me ---
// --- @desc    Student self-marks their own attendance
// --- @access  Private (Student-Only)
router.post('/me', auth, async (req, res) => {
    // Only students can use this route
    if (req.user.role !== 'student') {
        return res.status(403).json({ msg: 'Access Denied.' });
    }

    const { courseId } = req.body; // Only courseId is needed from client
    const studentId = req.user.id; // Get student ID from their token

    if (!courseId) {
        return res.status(400).json({ msg: 'Course ID is required.' });
    }

    // --- SECURITY FIX: Generate the date on the server ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight for consistent date comparison

    try {
        const newAttendance = new Attendance({
            student: studentId,
            course: courseId,
            date: today, // Use server-generated date
            status: 'Present', // Status is hard-coded for self-check-in
            markedBy: studentId // We can log that the student marked themselves
        });

        await newAttendance.save();
        res.status(201).json({ msg: 'Attendance marked successfully for today!' });

    } catch (err) {
        // This will fire if the unique index (student, course, date) is violated
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'You have already marked your attendance for this course today.' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        console.error("POST /api/attendance/me ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});
// --- *** END OF NEW ROUTE *** ---

module.exports = router;