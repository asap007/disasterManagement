// models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
  },
  peopleCount: {
    type: Number,
    required: true,
  },
  needDescription: {
    type: String,
    required: true,
  },
  status: { // e.g., 'Received', 'Acknowledged', 'Actioned'
    type: String,
    default: 'Received',
  },
  isUrgentMedical: { // Flag if it was an immediate medical emergency transfer
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Add other relevant fields as needed
});

module.exports = mongoose.model('Report', ReportSchema);

