const express = require('express');
const router = express.Router();
const Preference = require('../models/preference');

// GET /api/preferences?search=term&page=1 — paginated list with search
router.get('/', async (req, res) => {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = search
        ? { name: { $regex: new RegExp(search, 'i') } }
        : {};

    try {
        const preferences = await Preference.find(query)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await Preference.countDocuments(query);

        res.json({ preferences, total });
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/preferences — create a new preference
router.post('/', async (req, res) => {
    const { name } = req.body;

    try {
        const existing = await Preference.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Preference already exists' });
        }

        const preference = new Preference({ name: name.trim() });
        await preference.save();
        res.status(201).json(preference);
    } catch (err) {
        console.error('Error creating preference:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/preferences/:id — update a preference by ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const updated = await Preference.findByIdAndUpdate(
            id,
            { name: name.trim() },
            { new: true, runValidators: true }
        );

        if (!updated) return res.status(404).json({ message: 'Preference not found' });

        res.json(updated);
    } catch (err) {
        console.error('Error updating preference:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/preferences — delete multiple preferences
router.delete('/', async (req, res) => {
    const { ids } = req.body; // expects: { ids: ["id1", "id2", ...] }

    try {
        const result = await Preference.deleteMany({ _id: { $in: ids } });
        res.json({ message: `Deleted ${result.deletedCount} preferences` });
    } catch (err) {
        console.error('Error deleting preferences:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
