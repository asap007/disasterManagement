// routes/api.js
const express = require('express');
const multer = require('multer'); // Keep for document uploads later
const Report = require('../models/Report');
const Document = require('../models/Document');
const { getInformationResponse } = require('../services/geminiService');

const router = express.Router();

// --- Vapi Endpoint: Receiving Victim Reports ---
router.post('/report', async (req, res) => {
    // --- NEW: Log Headers and Body for Debugging ---
    console.log("--- /api/report Request Received ---");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Raw Body Received:", req.body); // See what express.json() produced
    // --- End Debugging Logs ---

    // Safety check for req.body
    if (!req.body) {
        console.error("Error: req.body is undefined or null.");
        return res.status(400).json({ message: 'Bad Request: Missing request body.' });
    }

    // --- CORRECTED: Destructure ONLY expected fields from body ---
    // We learned call_sid and caller_number are NOT in the body.
    // They are likely in headers (e.g., 'x-vapi-call-sid', 'x-vapi-caller-number' - CHECK LOGS!)
    const { location, people_count, need_description, is_urgent } = req.body;

    // Basic Validation (check if the fields Vapi *should* send are present)
    if (location === undefined || people_count === undefined || need_description === undefined) {
        console.error("Validation Error: Missing required fields (location, people_count, need_description) in body:", req.body);
        return res.status(400).json({ message: 'Missing required report fields in body' });
    }

    // --- NEW: Extract Call Info from Headers (Example - ADJUST HEADER NAMES BASED ON LOGS) ---
    const callSidFromHeader = req.headers['x-vapi-call-sid'] || req.headers['call-sid'] || `unknown-${Date.now()}`; // Use fallback
    const callerNumberFromHeader = req.headers['x-vapi-caller-number'] || req.headers['caller-number'] || null;
    console.log(`Extracted Call SID: ${callSidFromHeader}, Caller Number: ${callerNumberFromHeader}`);
    // --- End Header Extraction ---


    try {
        // Use callSidFromHeader for uniqueness check
        let existingReport = await Report.findOne({ callSid: callSidFromHeader });
        if (existingReport) {
            console.log(`Report with callSid ${callSidFromHeader} already exists. Updating.`);
            existingReport.location = location;
            existingReport.peopleCount = people_count;
            existingReport.needDescription = need_description;
            existingReport.callerNumber = callerNumberFromHeader || existingReport.callerNumber;
            existingReport.isUrgentMedical = is_urgent || existingReport.isUrgentMedical || false; // Handle potential undefined
            existingReport.timestamp = Date.now();
            await existingReport.save();
             return res.status(200).json({ message: 'Report updated successfully', reportId: existingReport._id });
        } else {
             // Create new report
            const newReport = new Report({
                callSid: callSidFromHeader, // Use value from header
                callerNumber: callerNumberFromHeader, // Use value from header
                location: location,
                peopleCount: people_count,
                needDescription: need_description,
                isUrgentMedical: is_urgent || false, // Handle potential undefined
                status: 'Received'
            });

            await newReport.save();
            console.log("Report saved successfully:", newReport._id);
            res.status(201).json({ message: 'Report received successfully', reportId: newReport._id });
        }

    } catch (error) {
        console.error("Error saving report:", error);
        res.status(500).json({ message: 'Internal server error processing report' });
    }
});

// --- Vapi Endpoint: Requesting Information (RAG) ---
router.post('/information', async (req, res) => {
    console.log("--- /api/information Request Received ---");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Raw Body Received:", req.body);
  
    if (!req.body) {
      console.error("Error: req.body is undefined or null.");
      return res.status(400).json({ message: 'Bad Request: Missing request body.' });
    }
  
    // Handle potential nested query
    const query = req.body.query || (req.body.data && req.body.data.query);
    if (!query) {
      console.error("Validation Error: Missing or misformatted query field in body:", req.body);
      return res.status(400).json({ message: 'Missing or misformatted query field' });
    }
  
    try {
      const answer = await getInformationResponse(query);
      console.log("Sending answer back to Vapi:", answer);
      res.status(200).json({ answer }); // Ensure consistent format
    } catch (error) {
      console.error("Error handling information request:", error);
      res.status(500).json({ answer: "Sorry, I couldn't process that request right now." });
    }
  });

// --- Dashboard Endpoint: Getting All Reports ---
router.get('/reports', async (req, res) => {
    try {
        const reports = await Report.find().sort({ timestamp: -1 });
        res.status(200).json(reports);
    } catch (error) {
        console.error("Error fetching reports for dashboard:", error);
        res.status(500).json({ message: 'Error fetching reports' });
    }
});

// --- Dashboard Endpoint: Uploading Documents for RAG ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/documents', upload.single('documentFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No document file uploaded.' });
    }
    try {
        let content = req.file.buffer.toString('utf-8');
        content = content.replace(/\s+/g, ' ').trim();
        if (!content) {
             return res.status(400).json({ message: 'Could not extract text content or file is empty.' });
        }
        const newDocument = new Document({
            filename: req.file.filename || `${Date.now()}-${req.file.originalname}`,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            content: content
        });
        await newDocument.save();
        console.log("Document saved:", newDocument.originalName);
        res.status(201).json({ message: 'Document uploaded and processed successfully.', docId: newDocument._id });
    } catch (error) {
        console.error("Error processing uploaded document:", error);
        res.status(500).json({ message: 'Error processing document' });
    }
});

 // --- Dashboard Endpoint: Getting List of Documents ---
router.get('/documents', async (req, res) => {
    try {
        const documents = await Document.find({}, 'originalName uploadedAt mimeType').sort({ uploadedAt: -1 });
        res.status(200).json(documents);
    } catch (error) {
        console.error("Error fetching document list:", error);
        res.status(500).json({ message: 'Error fetching document list' });
    }
});

module.exports = router;