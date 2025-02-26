const mongoose = require('mongoose');

const PreferenceSchema = new mongoose.Schema({
    title: String,
    location: String,
    job_type: String
});

const candidateSchema = new mongoose.Schema({
    email: String,
    industry: String,
    full_name: String,  // Add full name for candidate search
    preferences: [PreferenceSchema] // Add job preferences
});

module.exports = mongoose.model('Candidate', candidateSchema);
