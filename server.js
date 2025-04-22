// server.js (Should look like this)
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
// *** THESE ARE CRUCIAL and MUST come BEFORE app.use('/api', apiRoutes) ***
app.use(express.json()); // <--- Parses incoming JSON request bodies
app.use(express.urlencoded({ extended: false })); // Parses URL-encoded bodies (less relevant here but good practice)

// --- Log headers and body just before routing ---
// Useful for debugging Vapi requests
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2)); // Log all headers
  // req.body is logged *after* express.json() has run
  console.log('Body (after parsing attempt):', req.body);
  next(); // Continue to the next middleware/route
});
// --- End Debug Logging ---


// Define Routes
app.get('/', (req, res) => {
  res.send('Disaster Rescue Backend API Running');
});

app.use('/api', apiRoutes); // Mount API routes AFTER middleware

// Basic Error Handling
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));