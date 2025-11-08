/* routes/students.js - FINAL AND COMPLETE REPLACEMENT (All Fixes) */
const express = require('express');
const router = express.Router();
const { auth, adminAuth, facultyAndAdminAuth } = require('../middleware/auth');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const excel = require('exceljs');
const mongoose = require('mongoose');

// =========================================================================
//  Reusable Excel Generation Function and Column Definitions
// =========================================================================

/**
 * Generates the Excel report workbook, ensuring column integrity.
 */
const createExcelReport = (exportData, columns, sheetName, reportTitle) => {
    // 1. Create a brand new workbook instance
    const workbook = new excel.Workbook();
    workbook.creator = 'College Portal Admin';
    workbook.lastModifiedBy = 'System Export';
    
    // 2. Add a new worksheet
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Add main title for reports
    if (reportTitle) {
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = reportTitle;
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.addRow([]); // Empty row for spacing
    }
    
    // 3. Set the columns (This is the critical step for alignment)
    worksheet.columns = columns;
    
    // 4. Add the data rows (ExcelJS uses the column keys to match data)
    worksheet.addRows(exportData);
    
    return workbook;
};

// Definition for the Master Report (All Students)
const MASTER_COLUMNS = [
    { header: 'First Name', key: 'firstName', width: 20 },
    { header: 'Surname', key: 'surname', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Mobile', key: 'mobileNumber', width: 15 },
    { header: 'WhatsApp', key: 'whatsappNumber', width: 15 },
    { header: 'Personal Email', key: 'personalEmail', width: 30 },
    { header: 'Marks', key: 'marks', width: 15 },
    { header: 'Overall Attend %', key: 'attendancePercentage', width: 18, style: { numFmt: '0.00"%"' } }, // Fixed width
    { header: 'Total Present', key: 'presentDays', width: 13 },
    { header: 'Total Absent', key: 'absentDays', width: 13 },
    { header: 'Total Late', key: 'lateDays', width: 13 },
    { header: 'Total Days', key: 'totalDays', width: 13 },
    { header: 'Family Income', key: 'familyIncome', width: 15, style: { numFmt: '"$"#,##0' } },
    { header: 'Enrolled Courses', key: 'enrolledCourses', width: 40 },
    { header: 'User ID', key: 'userId', width: 25 },
];

// Function to generate the Course-Specific Column Definition
const getCourseColumns = (courseCode) => ([
    { header: 'First Name', key: 'firstName', width: 20 },
    { header: 'Surname', key: 'surname', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Mobile', key: 'mobileNumber', width: 15 },
    { header: 'WhatsApp', key: 'whatsappNumber', width: 15 },
    { header: 'Personal Email', key: 'personalEmail', width: 30 },
    { header: 'Marks', key: 'marks', width: 15 },
    { header: `Attend % (${courseCode})`, key: 'attendancePercentage', width: 15, style: { numFmt: '0.00"%"' } },
    { header: 'Present', key: 'presentDays', width: 10 },
    { header: 'Absent', key: 'absentDays', width: 10 },
    { header: 'Late', key: 'lateDays', width: 10 },
    { header: 'Total Days', key: 'totalDays', width: 10 },
    { header: 'Family Income', key: 'familyIncome', width: 15, style: { numFmt: '"$"#,##0' } },
]);

// =========================================================================
//  NEW MANAGEMENT ROUTES (FOR ENROLLMENT)
// =========================================================================

// --- @route   PUT api/students/manage-enroll/:studentId/:courseId ---
router.put('/manage-enroll/:studentId/:courseId', facultyAndAdminAuth, async (req, res) => {
    try {
        const { studentId, courseId } = req.params;
        
        const profile = await StudentProfile.findOneAndUpdate(
            { user: studentId },
            { $addToSet: { courses: courseId } }, 
            { new: true }
        ).select('courses').populate('courses');
        
        if (!profile) {
            return res.status(404).json({ msg: 'Student profile not found' });
        }
        res.json(profile.courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- @route   PUT api/students/manage-unenroll/:studentId/:courseId ---
router.put('/manage-unenroll/:studentId/:courseId', facultyAndAdminAuth, async (req, res) => {
    try {
        const { studentId, courseId } = req.params;

        const profile = await StudentProfile.findOneAndUpdate(
            { user: studentId },
            { $pull: { courses: courseId } }, 
            { new: true }
        ).select('courses').populate('courses');

        if (!profile) {
            return res.status(404).json({ msg: 'Student profile not found' });
        }
        res.json(profile.courses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =========================================================================
//  EXISTING ROUTES
// =========================================================================

// --- @route   GET api/students/search (Admin or Faculty) ---
router.get('/search', facultyAndAdminAuth, async (req, res) => {
    try {
        const searchQuery = req.query.name || '';
        const students = await StudentProfile.find({
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { surname: { $regex: searchQuery, $options: 'i' } }
            ]
        }).select('-familyIncome -certificates'); 
        res.json(students);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/students/by-course/:courseId (Admin or Faculty) ---
router.get('/by-course/:courseId', facultyAndAdminAuth, async (req, res) => {
    try {
        const students = await StudentProfile.find({ 
            courses: req.params.courseId 
        }).populate('user', ['name']);
        
        const studentList = students.map(s => ({
            _id: s._id,
            user: s.user._id,
            firstName: s.firstName,
            surname: s.surname
        }));
        
        res.json(studentList);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/students/me (Student-Only) ---
router.get('/me', auth, async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found for this user' });
        }
        res.json(profile);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/students/me/courses (Student-Only) ---
router.get('/me/courses', auth, async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ user: req.user.id })
            .select('courses')
            .populate('courses');
            
        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        res.json(profile.courses);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- @route   PUT api/students/me/enroll (Student-Only) ---
router.put('/me/enroll', auth, async (req, res) => {
    const { courseId } = req.body;
    try {
        const profile = await StudentProfile.findOneAndUpdate(
            { user: req.user.id },
            { $addToSet: { courses: courseId } }, // Adds course to array
            { new: true }
        ).select('courses').populate('courses');
        
        res.json(profile.courses);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- @route   PUT api/students/me/unenroll (Student-Only) ---
router.put('/me/unenroll', auth, async (req, res) => {
    const { courseId } = req.body;
    try {
        const profile = await StudentProfile.findOneAndUpdate(
            { user: req.user.id },
            { $pull: { courses: courseId } }, // Removes course from array
            { new: true }
        ).select('courses').populate('courses');

        res.json(profile.courses);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- @route   PUT api/students/me (Student-Only) ---
router.put('/me', auth, async (req, res) => {
    const { 
        firstName, surname, mobileNumber, personalEmail, isWhatsappSame, 
        whatsappNumber, photo, certificates, familyIncome 
    } = req.body;
    const profileFields = {};
    if (firstName) profileFields.firstName = firstName;
    if (surname) profileFields.surname = surname;
    if (mobileNumber) profileFields.mobileNumber = mobileNumber;
    if (personalEmail) profileFields.personalEmail = personalEmail;
    if (typeof isWhatsappSame === 'boolean') profileFields.isWhatsappSame = isWhatsappSame;
    if (whatsappNumber) profileFields.whatsappNumber = whatsappNumber;
    if (photo) profileFields.photo = photo;
    if (familyIncome) profileFields.familyIncome = familyIncome;
    if (certificates) profileFields.certificates = certificates;
    try {
        let profile = await StudentProfile.findOne({ user: req.user.id });
        if (!profile) return res.status(404).json({ msg: 'Profile not found' });
        profile = await StudentProfile.findOneAndUpdate(
            { user: req.user.id },
            { $set: profileFields },
            { new: true }
        );
        if (firstName || surname) {
            const newName = `${firstName || profile.firstName} ${surname || profile.surname}`;
            await User.findByIdAndUpdate(req.user.id, { $set: { name: newName.trim() } });
        }
        res.json(profile);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


// --- @route   PUT api/students/:userId (Admin or Faculty) ---
router.put('/:userId', facultyAndAdminAuth, async (req, res) => {
     const { 
        firstName, surname, mobileNumber, personalEmail, isWhatsappSame, 
        whatsappNumber, photo, certificates, familyIncome, marks
    } = req.body;
    const profileFields = {};
    if (firstName) profileFields.firstName = firstName;
    if (surname) profileFields.surname = surname;
    if (mobileNumber) profileFields.mobileNumber = mobileNumber;
    if (personalEmail) profileFields.personalEmail = personalEmail;
    if (typeof isWhatsappSame === 'boolean') profileFields.isWhatsappSame = isWhatsappSame;
    if (whatsappNumber) profileFields.whatsappNumber = whatsappNumber;
    if (photo) profileFields.photo = photo;
    if (familyIncome) profileFields.familyIncome = familyIncome;
    if (certificates) profileFields.certificates = certificates;
    if (marks) profileFields.marks = marks;
    try {
        let profile = await StudentProfile.findOne({ user: req.params.userId });
        if (!profile) return res.status(404).json({ msg: 'Profile not found' });
        profile = await StudentProfile.findOneAndUpdate(
            { user: req.params.userId },
            { $set: profileFields },
            { new: true }
        );
        if (firstName || surname) {
            const newName = `${firstName || profile.firstName} ${surname || profile.surname}`;
            await User.findByIdAndUpdate(req.params.userId, { $set: { name: newName.trim() } });
        }
        res.json(profile);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- @route   GET api/students/:userId (Admin or Faculty) ---
// --- UPDATED: ADD ATTENDANCE CALCULATION ---
router.get('/:userId', facultyAndAdminAuth, async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.params.userId);

        // 1. Fetch Profile
        const profile = await StudentProfile.findOne({ user: studentId })
            .populate('courses'); 
            
        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        // 2. Aggregate Attendance for this student across ALL courses
        const attendanceStats = await Attendance.aggregate([
            { $match: { student: studentId } }, // Only match this student
            {
                $group: {
                    _id: null, // Group all records together
                    present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
                    late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } }
                }
            },
            {
                $addFields: {
                    totalDays: { $add: ['$present', '$absent', '$late'] },
                    attendedDays: { $add: ['$present', '$late'] }
                }
            },
            {
                $project: {
                    _id: 0,
                    percentage: {
                        $cond: [
                            { $eq: ['$totalDays', 0] },
                            0, 
                            { $multiply: [{ $divide: ['$attendedDays', '$totalDays'] }, 100] }
                        ]
                    }
                }
            }
        ]);
        
        // 3. Attach the percentage to the profile object
        const profileObject = profile.toObject(); // Convert to plain object to modify
        if (attendanceStats.length > 0) {
            profileObject.overallAttendancePercentage = attendanceStats[0].percentage;
        } else {
            profileObject.overallAttendancePercentage = 0;
        }

        res.json(profileObject); // Send the combined data
    } catch (err) {
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Profile not found' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- MASTER EXPORT ROUTE ---
// --- @route   GET api/students/export/all (Admin-Only) ---
router.get('/export/all', adminAuth, async (req, res) => {
    try {
        // 1. Get all-time attendance stats
        const allStats = await Attendance.aggregate([
            { $group: { _id: "$student", present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } } } },
            { $addFields: { totalDays: { $add: ['$present', '$absent', '$late'] }, attendedDays: { $add: ['$present', '$late'] } } },
            { $addFields: { overallPercentage: { $cond: [ { $eq: ['$totalDays', 0] }, 0, { $multiply: [{ $divide: ['$attendedDays', '$totalDays'] }, 100] } ] } } }
        ]);
        
        const statsMap = new Map();
        allStats.forEach(stat => {
            statsMap.set(stat._id.toString(), { percentage: stat.overallPercentage, present: stat.present, absent: stat.absent, late: stat.late, total: stat.totalDays });
        });

        const students = await StudentProfile.find({})
                                .populate('user', 'email status')
                                .populate('courses', 'code');
        
        // 3. Combine all data (ORDERED)
        const exportData = students.map(student => {
            if (!student.user) return null; 
            const stats = statsMap.get(student.user._id.toString()) || { percentage: 0, present: 0, absent: 0, late: 0, total: 0 };
            
            return {
                firstName: student.firstName, surname: student.surname, email: student.user.email, status: student.user.status, mobileNumber: student.mobileNumber, whatsappNumber: student.isWhatsappSame ? student.mobileNumber : student.whatsappNumber, personalEmail: student.personalEmail, marks: student.marks, attendancePercentage: stats.percentage, presentDays: stats.present, absentDays: stats.absent, lateDays: stats.late, totalDays: stats.total, familyIncome: student.familyIncome, enrolledCourses: student.courses.map(c => c.code).join(', '), userId: student.user._id,
            };
        }).filter(Boolean);

        // 4. Create the Excel Workbook
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('All Students');
        
        // 5. EXPLICITLY DEFINE HEADERS (Manual Row 1 - CRITICAL FIX)
        const headerRow = [
            'First Name', 'Surname', 'Email', 'Status', 'Mobile', 'WhatsApp',
            'Personal Email', 'Marks', 'Overall Attend %', 'Total Present',
            'Total Absent', 'Total Late', 'Total Days', 'Family Income',
            'Enrolled Courses', 'User ID'
        ];
        worksheet.addRow(headerRow);
        
        // 6. Define columns (Needed for keys/formatting, but headers are set above)
        worksheet.columns = MASTER_COLUMNS;

        // 7. Add data rows manually (This forces the data to start after the header row)
        exportData.forEach(data => {
            const row = worksheet.addRow(data);
            
            // Apply formatting styles directly by column index
            row.getCell(9).numFmt = '0.00"%"'; // Overall Attend % (Column I)
            row.getCell(14).numFmt = '"$"#,##0'; // Family Income (Column N)
        });

        // 8. Style the header row (For clarity)
        const header = worksheet.getRow(1);
        header.font = { bold: true };

        // 9. Set headers and send the file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="all_students_export.xlsx"');
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// --- COURSE-SPECIFIC EXPORT ROUTE ---
// --- @route   GET api/students/export/:courseId (Admin-Only) ---
router.get('/export/:courseId', adminAuth, async (req, res) => {
    try {
        const courseId = new mongoose.Types.ObjectId(req.params.courseId);

        const course = await Course.findById(courseId);
        if (!course) { return res.status(404).json({ msg: 'Course not found' }); }

        const students = await StudentProfile.find({ courses: courseId })
                                .populate('user', 'email status');
        
        const studentIds = students.map(s => s.user._id);

        // 3. Get attendance stats ONLY for this course
        const courseStats = await Attendance.aggregate([
            { $match: { course: courseId, student: { $in: studentIds } } },
            { $group: { _id: "$student", present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } } } },
            { $addFields: { totalDays: { $add: ['$present', '$absent', '$late'] }, attendedDays: { $add: ['$present', '$late'] } } },
            { $addFields: { percentage: { $cond: [ { $eq: ['$totalDays', 0] }, 0, { $multiply: [{ $divide: ['$attendedDays', '$totalDays'] }, 100] } ] } } }
        ]);
        
        const statsMap = new Map();
        courseStats.forEach(stat => {
            statsMap.set(stat._id.toString(), { percentage: stat.percentage, present: stat.present, absent: stat.absent, late: stat.late, total: stat.totalDays });
        });

        // 4. Combine data (ORDERED TO MATCH COLUMNS)
        const exportData = students.map(student => {
            if (!student.user) return null;
            const stats = statsMap.get(student.user._id.toString()) || { percentage: 0, present: 0, absent: 0, late: 0, total: 0 };
            
            return {
                firstName: student.firstName, surname: student.surname, email: student.user.email, status: student.user.status, mobileNumber: student.mobileNumber, whatsappNumber: student.isWhatsappSame ? student.mobileNumber : student.whatsappNumber, personalEmail: student.personalEmail, marks: student.marks, attendancePercentage: stats.percentage, presentDays: stats.present, absentDays: stats.absent, lateDays: stats.late, totalDays: stats.total, familyIncome: student.familyIncome,
            };
        }).filter(Boolean);

        // 5. Create Excel file
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet(course.code);
        
        // Add course title
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = `${course.code} - ${course.title}`;
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.addRow([]); // Empty row
        
        // 6. Define columns (Standard method for this report)
        worksheet.columns = getCourseColumns(course.code);
        
        // 7. Add data rows
        worksheet.addRows(exportData);

        // 8. Send the file
        const fileName = `${course.code}_students_export.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;