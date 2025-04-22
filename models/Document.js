// models/Document.js (For RAG Context)
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    content: { // Store the text content extracted from the document
        type: String,
        required: true
    },
    // In a full RAG system, you'd store embeddings here instead of/in addition to raw content
    // embedding: { type: [Number] }
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Document', DocumentSchema);