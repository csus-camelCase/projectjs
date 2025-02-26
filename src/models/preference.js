const express = require('express');
const path = require('path');

module.exports = () => {
    const router = express.Router();

    // Reference preferences route already defined in server.js
    router.use('/api/save-preferences', (req, res, next) => {
        req.app._router.handle(req, res, next); // Delegates to server.js for processing
    });

    // Serve preferences.html
    router.get('/preferences.html', (req, res) => {
        res.sendFile(path.join(__dirname, '../html/preferences.html')); // Adjust path if necessary
    });

    return router;
};
