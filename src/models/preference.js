//schema for storing job preferences
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Job', jobSchema);