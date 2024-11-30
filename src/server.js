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
    preferences: { type: Array, default: [] }, // Added preferences field
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
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    full_name: { type: String, default: 'Anonymous' },
    experience: { type: Array, default: [] },
    skills: { type: Array, default: [] },
    education: [{ degree: String, institution: String, year: Number }],
    preferences: { type: Array, default: [] }, // Job preferences
    resume_url: { type: String },
    status: { type: String, default: 'active' },
});

const Profile = mongoose.model('Profile', profileSchema, 'profiles');

//
//
// Middleware
//
//

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'html')));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html'));

//
//
// Routes
//
//

// Serve index.ejs for /
app.get('/', (req, res) => {
    const email = req.cookies.email || ''; // Pre-fill email if "Remember Me" was checked
    res.render('index.ejs', { email });
});

app.get('/api/user-info', async (req, res) => {
    const userId = req.session.userId; // Ensure the user is logged in
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ first_name: user.first_name });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/index.html', (req, res) => {
    const email = req.cookies.email || '';
    res.render('index.ejs', { email });
});

// Job-related routes
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find();
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Error fetching jobs');
    }
});

// Use preference router for preference-related logic
const preferenceRouter = require('./models/preference')({ User }); // Pass User model explicitly
app.use(preferenceRouter);

app.post('/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid email or password');
        }

        req.session.userId = user._id;
        req.session.role = user.role;
        req.session.isAdmin = user.isAdmin;

        user.last_login = new Date();
        await user.save();

        if (rememberMe === 'on') {
            res.cookie('email', email, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        } else {
            res.clearCookie('email');
        }

        res.redirect(user.isAdmin ? '/admin_dashboard.html' : '/user_dashboard.html');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

// Save preferences logic 
app.post('/api/save-preferences', async (req, res) => {
    const userId = req.session.userId; // Ensure the user is logged in
    console.log('Session userId:', userId); // Debugging

    const { preferences } = req.body; // Preferences sent from the frontend
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const profile = await Profile.findOne({ user_id: userId }); // Find the user's profile
        console.log('Profile fetched:', profile); // Debugging

        if (!profile) {
            return res.status(404).send('User profile not found');
        }

        // Update preferences array in the `profiles` collection
        const updatedPreferences = preferences.map(job => ({
            title: job.title,
            location: job.location,
            job_type: job.job_type,
        }));

        profile.preferences = updatedPreferences; // Replace with the selected job details
        await profile.save();

        res.status(200).send('Preferences saved successfully');
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).send('An error occurred while saving preferences');
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

app.post('/delete_account', async (req, res) => {
    const userId = req.session.userId; // Ensure the user is logged in

    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    try {
        // Delete the user
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).send('User not found');
        }

        // Delete the associated profile
        await Profile.findOneAndDelete({ user_id: userId });

        // Clear session and cookies
        req.session.destroy();
        res.clearCookie('connect.sid');

        res.redirect('/index.html'); // Redirect to the homepage after account deletion
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send('An error occurred while deleting your account');
    }
});

// Handle /submit_settings POST request
app.post('/submit_settings', async (req, res) => {
    const userId = req.session.userId; // Ensure the user is logged in
    const { first_name, last_name, email } = req.body; // Extract inputs from the form

    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

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

        // Update the associated entry in the profiles collection
        const updatedProfile = await Profile.findOneAndUpdate(
            { user_id: userId },
            { 
                full_name: `${first_name} ${last_name}` // Update full_name in profile
            },
            { new: true } // Return the updated document
        );

        if (!updatedProfile) {
            return res.status(404).send('User profile not found');
        }

        res.redirect('/preferences.html'); // Redirect back to preferences page
    } catch (error) {
        console.error('Error updating user or profile information:', error);
        res.status(500).send('An error occurred while updating your information');
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = { User, Job, Profile };

