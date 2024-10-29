const mongoose = require('mongoose');

const loginSchema = new mongoose.Schema({
    email: String,
    industry: String
});

module.exports = mongoose.model('Candidate', loginSchema);