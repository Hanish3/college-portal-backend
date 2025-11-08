/* routes/grades.js (NEW FILE) */
const express = require('express');
const router = express.Router();
const { auth, facultyAndAdminAuth } = require('../middleware/auth');
const Grade = require('../models/Grade');
const StudentProfile = require('../models/StudentProfile');

// --- @route   GET api/grades/course/:courseId ---
// --- @desc    Get all students and their grades for one course
// --- @access  Private (Admin or Faculty)
router.get('/course/:courseId', facultyAndAdminAuth, async (req, res) => {
    try {
        const courseId = req.params.courseId;

        // 1. Get all students enrolled in this course
        // (We use StudentProfile to find them, but populate the 'user' field)
        const students = await StudentProfile.find({ courses: courseId })
            .select('user')
            .populate('user', 'name email');
        
        if (!students || students.length === 0) {
            return res.json([]); // Return empty if no students
        }

        const studentIds = students.map(s => s.user._id);

        // 2. Get all *existing* grades for those students in this course
        // We'll default to "Overall Grade" for simplicity
        const grades = await Grade.find({
            course: courseId,
            student: { $in: studentIds },
            assessmentTitle: 'Overall Grade' 
        });

        // 3. Create a Map for easy grade lookup
        const gradeMap = new Map();
        grades.forEach(grade => {
            gradeMap.set(grade.student.toString(), grade);
        });

        // 4. Combine student list with their grades
        const gradebookData = students.map(profile => {
            if (!profile.user) return null; // Skip if profile user is missing
            
            const grade = gradeMap.get(profile.user._id.toString());
            
            return {
                studentId: profile.user._id,
                name: profile.user.name,
                email: profile.user.email,
                // If a grade exists, use it. Otherwise, default to 0.
                marksObtained: grade ? grade.marksObtained : 0,
                totalMarks: grade ? grade.totalMarks : 100,
            };
        }).filter(Boolean); // Filter out any null entries

        res.json(gradebookData);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- @route   POST api/grades/batch ---
// --- @desc    Create or update multiple grades at once (Upsert)
// --- @access  Private (Admin or Faculty)
router.post('/batch', facultyAndAdminAuth, async (req, res) => {
    // Expects: { courseId: "...", totalMarks: 100, grades: [ { studentId: "...", marksObtained: 85 }, ... ] }
    const { courseId, totalMarks, grades } = req.body;

    if (!courseId || !Array.isArray(grades)) {
        return res.status(400).json({ msg: 'Invalid data format.' });
    }

    try {
        const markedBy = req.user.id;
        const assessmentTitle = 'Overall Grade'; // Hardcoding for simplicity

        // Create an array of 'updateOne' operations for bulkWrite
        const operations = grades.map(grade => ({
            updateOne: {
                // Find a grade matching this student, course, and title
                filter: { 
                    student: grade.studentId, 
                    course: courseId, 
                    assessmentTitle: assessmentTitle
                },
                // Set the new data
                update: { 
                    $set: {
                        marksObtained: grade.marksObtained,
                        totalMarks: totalMarks,
                        markedBy: markedBy
                    }
                },
                // If it doesn't exist, create it
                upsert: true 
            }
        }));

        // Execute all operations in one database call
        const result = await Grade.bulkWrite(operations);

        res.status(201).json({ 
            msg: `Grades saved successfully. ${result.upsertedCount} created, ${result.modifiedCount} updated.`
        });

    } catch (err) {
        console.error("Grade Batch Error:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
});


// --- @route   GET api/grades/me ---
// --- @desc    Get all grades for the logged-in student
// --- @access  Private (Student-Only)
router.get('/me', auth, async (req, res) => {
    // Only students can access this
    if (req.user.role !== 'student') {
        return res.status(403).json({ msg: 'Access Denied' });
    }

    try {
        const grades = await Grade.find({ student: req.user.id })
            .populate('course', 'title code') // Get the course name and code
            .sort({ 'course.code': 1 });
            
        res.json(grades);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- *** THIS IS THE NEW ROUTE YOU MUST ADD *** ---

// --- @route   GET api/grades/student/:userId ---
// --- @desc    Get all grades for a specific student (for Admins/Faculty)
// --- @access  Private (Admin or Faculty)
router.get('/student/:userId', facultyAndAdminAuth, async (req, res) => {
    try {
        const grades = await Grade.find({ student: req.params.userId })
            .populate('course', 'title code') // Get the course name and code
            .sort({ 'course.code': 1 });
            
        res.json(grades);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;