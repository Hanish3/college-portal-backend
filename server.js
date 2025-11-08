/* server.js */
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

// Initialize express
const app = express();

// Connect to Database
connectDB();

// --- Middlewares ---
// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors());
// Enable express to parse JSON in request bodies
app.use(express.json());

// --- Define API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/events', require('./routes/events'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/survey', require('./routes/survey'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/survey-questions', require('./routes/surveyQuestions'));

// --- THIS IS THE FIXED LINE ---
app.use('/api/grades', require('./routes/grades'));

// --- THIS IS THE ROUTE YOU ADDED ---
app.use('/api/upload', require('./routes/upload'));


// Define the Port
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));