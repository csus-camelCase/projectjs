const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CONNECTION = process.env.CONNECTION;

// MongoDB Job Schema for job preferences
const jobSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' }
});

const Job = mongoose.model('Job', jobSchema, 'jobs');

// User schema with unique constraint on username
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true, required: true }, // Username must be unique and required
    password: String,
    first_name: String,
    last_name: String,
    role: { type: String, default: 'candidate' },
    isAdmin: { type: Boolean, default: false }, // Indicates if the user is an admin
    created_at: { type: Date, default: Date.now },
    last_login: Date
});

// Hash password before saving it to the database
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) { // Only hash the password if it's been modified
        try {
            const salt = await bcrypt.genSalt(10);  // Generate a salt
            const hashedPassword = await bcrypt.hash(this.password, salt);  // Hash the password
            this.password = hashedPassword;  // Store the hashed password
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();  // Proceed without modifying password if not changed
    }
});

const User = mongoose.model('User', userSchema, 'users');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'html')));

// Serve the signup page
app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'signup.html'));
});

// Handle signup form submission
app.post('/signup.html', async (req, res) => {
    const { email, password, first_name, last_name, username } = req.body;

    // Determine role and isAdmin based on some condition
    const isAdmin = email === 'admin@example.com'; // Example condition
    const role = isAdmin ? 'admin' : 'candidate';

    const newUser = new User({
        email,
        password, // Password will be hashed
        username,
        first_name,
        last_name,
        role,
        isAdmin
    });

    try {
        await newUser.save();
        res.redirect('/index.html');
    } catch (error) {
        console.error(error);

        // Handle duplicate key errors for both email and username
        if (error.code === 11000) {
            const duplicateField = error.keyValue.username ? 'Username' : 'Email';
            res.status(400).send(`${duplicateField} already exists`);
        } else {
            res.status(400).send('An error occurred');
        }
    }
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid email or password');
        }

        // Compare provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid email or password');
        }

        // Store user info in session
        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.isAdmin = user.isAdmin;

        // Update last login time
        user.last_login = new Date();
        await user.save();

        // Redirect based on isAdmin
        if (user.isAdmin) {
            res.redirect('/admin_dashboard.html');
        } else {
            res.redirect('/user_dashboard.html');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

// Serve the user dashboard
app.get('/user_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'user_dashboard.html'));
});

// Serve the admin dashboard
app.get('/admin_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'admin_dashboard.html'));
});

// Admin: Add new job preferences to the database
app.post('/api/job-preferences', async (req, res) => {
    const { name, description } = req.body;

    const newJob = new Job({
        name,
        description
    });

    try {
        await newJob.save();
        res.status(201).json(newJob); // Send back the created job preference
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding job preference');
    }
});

// Admin: Fetch all job preferences
app.get('/api/job-preferences', async (req, res) => {
    try {
        const jobPreferences = await Job.find(); // Fetch all job preferences
        res.json(jobPreferences); // Send job preferences as JSON
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching job preferences');
    }
});

// Serve the preferences page
app.get('/preferences.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'preferences.html'));
});

// Start the server and connect to MongoDB
const start = async () => {
    try {
        await mongoose.connect(CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.log(err.message);
    }
};

start();
