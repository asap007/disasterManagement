// services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const Document = require('../models/Document'); // Import Document model

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Basic RAG Implementation (Simple Context Stuffing) ---
// In a real app, use vector embeddings and similarity search here.
// For hackathon: Fetch relevant docs (or just all docs if few) and put text into context.
async function getRelevantContext(query) {
    try {
        // Super simple approach: Get text from ALL documents.
        // WARNING: This has significant limitations on the number/size of documents.
        const documents = await Document.find({}, 'content').limit(5); // Limit to avoid huge context
        let context = "Use the following information to answer the user's question:\n\n";
        documents.forEach((doc, index) => {
            context += `--- Document ${index + 1} ---\n${doc.content}\n\n`;
        });
        console.log("Using context string length:", context.length); // Check length
        return context;
    } catch (error) {
        console.error("Error fetching documents for context:", error);
        return "No specific context documents are available right now."; // Fallback context
    }
}
// --- End RAG Section ---

async function getInformationResponse(userQuery) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"}); // Or another suitable model

    // --- RAG Integration ---
    const context = await getRelevantContext(userQuery);
    const prompt = `
      ${context}
      ---
      You are a Disaster Response Information AI. Answer the following user question based ONLY on the information provided above. If the information isn't present, say you cannot answer specifically but provide general safety advice relevant to disaster situations if appropriate. Be calm and clear.

      User Question: "${userQuery}"

      Answer:
    `;
    // --- End RAG Integration ---


    console.log("Sending prompt to Gemini..."); // Log the prompt being sent (optional)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Received response from Gemini.");
    return text;

  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    // Provide a safe fallback response
    return "I encountered an issue trying to retrieve that information. Please rely on official local announcements for now and stay safe.";
  }
}

module.exports = { getInformationResponse };