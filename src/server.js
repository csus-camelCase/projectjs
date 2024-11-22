const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const multer = require('multer');
const AWS = require('aws-sdk');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CONNECTION = process.env.CONNECTION;

// MongoDB Connection
mongoose.connect(CONNECTION, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// AWS Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();

// Multer Configuration for File Uploads
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB Schemas
const jobSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
});
const Job = mongoose.model('Job', jobSchema, 'jobs');

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true, required: true },
    password: String,
    first_name: String,
    last_name: String,
    role: { type: String, default: 'candidate' },
    isAdmin: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    last_login: Date,
});
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(this.password, salt);
            this.password = hashedPassword;
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});
const User = mongoose.model('User', userSchema, 'users');

const profileSchema = new mongoose.Schema({
    user_id: { type: mongoose.ObjectId },
    full_name: { type: String, default: "Anonymous" },
    experience: { type: Array, default: [] },
    skills: { type: Array, default: [] },
    education: [{ degree: String, institution: String, year: Number }],
    preferences: { type: Array, default: [] },
    resume_url: { type: String, required: true },
    status: { type: String, default: "active" },
});
const Profile = mongoose.model('Profile', profileSchema, 'profiles');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'html')));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html'));

// Routes
// Serve index.ejs for /
app.get('/', (req, res) => {
    const email = req.cookies.email || ''; // Pre-fill email if "Remember Me" was checked
    res.render('index.ejs', { email });
});

app.get('/index.html', (req, res) => {
    const email = req.cookies.email || '';
    res.render('index.ejs', { email });
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'signup.html'));
});

app.post('/signup.html', async (req, res) => {
    const { email, password, first_name, last_name, username } = req.body;
    const isAdmin = email === 'admin@example.com';
    const role = isAdmin ? 'admin' : 'candidate';

    const newUser = new User({
        email,
        password,
        username,
        first_name,
        last_name,
        role,
        isAdmin,
    });

    try {
        await newUser.save();
        res.redirect('/index.html');
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            const duplicateField = error.keyValue.username ? 'Username' : 'Email';
            res.status(400).send(`${duplicateField} already exists`);
        } else {
            res.status(400).send('An error occurred');
        }
    }
});

// Handle /submit_setup POST request
app.post('/submit_setup', upload.single('resume'), async (req, res) => {
    const { zipcode, degree } = req.body;
    const file = req.file;

    try {
        // Fetch the logged-in user
        const userId = req.session.userId; // Assuming the user is logged in and session contains the user ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        const fullName = `${user.first_name} ${user.last_name}`; // Construct the full name

        // Upload resume to S3
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `resumes/${Date.now()}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const s3Response = await s3.upload(s3Params).promise();

        // Save profile to MongoDB
        const newProfile = new Profile({
            user_id: userId,
            full_name: fullName,
            education: [{ degree }],
            resume_url: s3Response.Location,
            status: "active",
        });

        await newProfile.save();
        res.redirect('/user_dashboard.html');
    } catch (error) {
        console.error('Error saving profile:', error);
        res.status(500).send('An error occurred while saving the profile');
    }
});

// API: Fetch all jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find(); // Fetch all jobs from the database
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Error fetching jobs');
    }
});

// API: Save job preferences
app.post('/api/save-preferences', async (req, res) => {
    const userId = req.session.userId; // Ensure user is logged in
    const { preferences } = req.body; // Preferences from frontend

    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    try {
        // Update the user's preferences in their profile
        const updatedProfile = await Profile.findOneAndUpdate(
            { user_id: userId },
            { preferences }, // Save preferences
            { new: true } // Return updated document
        );

        if (!updatedProfile) {
            return res.status(404).send('User profile not found');
        }

        res.status(200).send('Preferences saved successfully');
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).send('An error occurred while saving preferences');
    }
});

// API: Job preferences management
app.post('/api/job-preferences', async (req, res) => {
    const { name, description } = req.body;

    const newJob = new Job({
        name,
        description,
    });

    try {
        await newJob.save();
        res.status(201).json(newJob);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding job preference');
    }
});

app.get('/preferences.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'preferences.html'));
});

app.post('/submit_settings', async (req, res) => {
    const { first_name, last_name, email } = req.body;
    const userId = req.session.userId; 

    try {
        // Update user information in the database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { first_name, last_name, email },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).send('User not found');
        }

        // Update profile full name if a corresponding profile exists
        await Profile.findOneAndUpdate(
            { user_id: userId },
            { full_name: `${first_name} ${last_name}` }
        );

        res.redirect('/preferences.html'); // Redirect back to preferences page
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).send('An error occurred while updating your settings');
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
