/* config/db.js */
const mongoose = require('mongoose');
const cron = require('node-cron'); // --- 1. Import the new library ---

// --- 2. Import the models needed for the job ---
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Attendance = require('../models/Attendance');


// --- 3. This is the new function that will run every night ---
/**
 * This job finds all active students who are missing an attendance record
 * for "today" and marks them as "Absent".
 */
const markAbsentees = async () => {
    console.log('[Cron Job] Running: Mark Absentees for today...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight for a clean date comparison

    try {
        // 1. Get all profiles for users who are active students
        const activeProfiles = await StudentProfile.find({})
            .select('user courses') // We only need the user ID and their courses
            .populate({
                path: 'user',
                select: 'status',
                match: { status: 'active', role: 'student' } // Only populate if the user is an active student
            });
        
        // 2. Filter out any profiles that didn't match (e.g., suspended or non-student users)
        const activeStudents = activeProfiles.filter(p => p.user);
        
        if (activeStudents.length === 0) {
            console.log('[Cron Job] No active students found. Job complete.');
            return;
        }

        // 3. Get all *existing* attendance records for today.
        // This is much more efficient than checking the DB for every single student.
        const existingRecords = await Attendance.find({ date: today }).select('student course');

        // 4. Create a "lookup Set" for very fast checking.
        // The key will be "studentId-courseId"
        const recordSet = new Set();
        existingRecords.forEach(r => {
            recordSet.add(`${r.student}-${r.course}`);
        });

        // 5. This array will hold all the new "Absent" records we need to create
        const recordsToCreate = [];

        // 6. Loop through all active students and their courses
        for (const profile of activeStudents) {
            if (profile.courses && profile.courses.length > 0) {
                
                for (const courseId of profile.courses) {
                    const lookupKey = `${profile.user._id}-${courseId}`;
                    
                    // 7. If this student-course pair is NOT in the Set, they are missing a record
                    if (!recordSet.has(lookupKey)) {
                        recordsToCreate.push({
                            student: profile.user._id,
                            course: courseId,
                            date: today,
                            status: 'Absent',
                            markedBy: null // 'null' signifies a system-generated entry
                        });
                    }
                }
            }
        }

        // 8. Finally, insert all the new "Absent" records in one single database operation
        if (recordsToCreate.length > 0) {
            await Attendance.insertMany(recordsToCreate);
            console.log(`[Cron Job] Success: Marked ${recordsToCreate.length} students as Absent.`);
        } else {
            console.log('[Cron Job] All active students already have attendance records. No one marked absent.');
        }

    } catch (err) {
        console.error('[Cron Job] ERROR marking absentees:', err.message);
    }
};


// --- 4. This is your existing connectDB function, now with the scheduler added ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // --- 5. SCHEDULE THE JOB ---
        // *** THIS LINE IS UPDATED ***
        // This runs the 'markAbsentees' function every day at 12:00 PM (noon)
        cron.schedule('0 12 * * *', markAbsentees, {
            timezone: "Asia/Kolkata" // Set to your server's timezone
        });

        console.log('Scheduled "Mark Absentees" job to run every day at 12:00 (12:00 PM).');

    } catch (err) {
        console.error(err.message);
        // Exit process with failure
        process.exit(1); 
    }
};

module.exports = connectDB;