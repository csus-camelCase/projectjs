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
const { title } = require('process');
const moment = require('moment');
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
    title: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    requirements: { type: [String], default: [] }, // Default to an empty array
    client_name: { type: String, required: true },
    location: { type: String, required: true },
    job_type: { type: String, enum: ['full-time', 'part-time', 'contract'], required: true },
    created_at: { type: Date, default: Date.now },
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
    // Only hash the password if it's not already hashed
    if (this.isModified('password') && !this.password.startsWith('$2a$')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (err) {
            return next(err);
        }
    }
    next();
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

const eventSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    date: { type: String, required: true }, // Use ISO 8601 format for better date handling
    time: { type: String, required: true },
    location: { type: String, required: true },
    calendarLink: { type: String }, // Optional: link to Google Calendar or similar
});

const Event = mongoose.model('Event', eventSchema, 'events');
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

//preference search route
app.get('/api/search-preferences', async (req, res) => {
    const searchTerm = req.query.term;
    console.log('\n--- NEW SEARCH REQUEST ---');
    console.log(`Search term: "${searchTerm}"`);

    if (!searchTerm || searchTerm.length < 2) {
        console.log('Search term too short (minimum 2 characters required)');
        return res.json([]);
    }

    try {
        console.log('\n[1/3] Querying database for profiles with preferences...');
        const profiles = await Profile.aggregate([
            {
                $match: {
                    preferences: { 
                        $exists: true,
                        $not: { $size: 0 } 
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 1,
                    full_name: 1,
                    preferences: 1,
                    email: '$user.email',
                    status: 1
                }
            }
        ]);

        console.log(`[2/3] Found ${profiles.length} profiles with preferences`);
        
        if (profiles.length > 0) {
            console.log('\nSample profile preferences:');
            console.log({
                name: profiles[0].full_name,
                email: profiles[0].email,
                preferences: profiles[0].preferences,
                preference_types: profiles[0].preferences.map(p => typeof p)
            });
        }

        console.log('\n[3/3] Filtering results...');
        const filtered = profiles.filter(profile => {
            if (!Array.isArray(profile.preferences)) {
                console.log(`Profile ${profile._id} has non-array preferences:`, profile.preferences);
                return false;
            }
            
            return profile.preferences.some(pref => {
                const prefString = typeof pref === 'object' ? 
                    JSON.stringify(pref) : 
                    String(pref);
                const match = prefString.toLowerCase().includes(searchTerm.toLowerCase());
                if (match) {
                    console.log(`Match found in profile ${profile._id}:`, {
                        preference: pref,
                        as_string: prefString
                    });
                }
                return match;
            });
        });

        console.log(`\nFound ${filtered.length} matching profiles`);
        console.log('--- END OF SEARCH ---\n');
        res.json(filtered.slice(0, 50));
    } catch (error) {
        console.error('\n!!! SEARCH ERROR !!!');
        console.error(error);
        res.status(500).json({ error: 'Failed to search preferences' });
    }
});

// Send emails to all recipients listed in query string
app.post('/api/send-email', async (req, res) => {
    const { recipient, subject, message } = req.body;

    const API_URL = "https://du55u2rij4.execute-api.us-west-2.amazonaws.com/dev/send-email";
    const API_KEY = "rlFQMGqpw72w4NnytZBapaLsFnc2WaQH1mrTZ0un";

    const requestData = {
        toAddress: recipient,
        subject: subject,
        body: message
    };

    async function sendEmail() {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "x-api-key": API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();
            console.log("Response:", data);
        } catch (error) {
            console.error("Error:", error.message);
        }
    }

    sendEmail();
});

app.post('/process-selections', async (req, res) => {
    try {
        const selectedCandidates = req.body.selectedCandidates; // Array of selected candidate IDs

        if (!selectedCandidates || selectedCandidates.length === 0) {
        }

        // Fetch profiles of selected candidates
        const profiles = await Profile.find({ _id: { $in: selectedCandidates } }, 'user_id');

        // Extract user IDs from profiles
        const userIds = profiles.map(profile => profile.user_id);

        // Fetch user emails using the user IDs
        const users = await User.find({ _id: { $in: userIds } }, 'email');
        const emails = users.map(user => user.email);

        // Log the selected candidate IDs and their emails
        console.log('Selected Candidates:', selectedCandidates);
        console.log('Emails:', emails);

        // Pass emails as a query string to send-emails.html
        res.redirect(`/send-emails.html?emails=${encodeURIComponent(emails.join(','))}`);
    } catch (error) {
        console.error('Error processing selected candidates:', error);
        res.status(500).send('Error processing selected candidates');
    }
});


app.get('/search', async (req, res) => {
    try {
        const profiles = await Profile.find({}, 'user_id');
        const userIds = profiles.map(profile => profile.user_id);
        const users = await User.find({ _id: { $in: userIds } }, 'first_name last_name created_at last_login');
        const filteredUsers = users.filter(user => !user.isAdmin); // Exclude admins
        users.forEach(user => {
            user.formattedCreatedAt = moment(user.created_at).format('MMMM YYYY');
            user.formattedLastLogin = moment(user.last_login).format('MMMM YYYY');
          });
        res.render('search', { users: filteredUsers }); // Render the 'search.ejs' view and pass profiles
    } catch (error) { 
        console.error('Error fetching profiles:', error);
        res.status(500).send('Error fetching candidates');
    }
});

//candidate seach modification
app.get('/search-candidates', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.json([]); // Return an empty array if no query is provided
    }

    try {
        const profiles = await Profile.find({}, 'user_id');
        const userIds = profiles.map(profile => profile.user_id);
        const users = await User.find({ _id: { $in: userIds },
            $or: [
                { first_name: { $regex: query, $options: 'i' } },  // Case-insensitive name search
                { last_name: { $regex: query, $options: 'i' } }
            ]
        }).lean();
        const filteredUsers = users.filter(user => !user.isAdmin); // Exclude admins
        users.forEach(user => {
            user.formattedCreatedAt = moment(user.created_at).format('MMMM YYYY');
            user.formattedLastLogin = moment(user.last_login).format('MMMM YYYY');
          });

        res.json(filteredUsers);
    } catch (error) {
        console.error('Error searching candidates:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/search-admins', async (req, res) => {
    try {
        const searchTerm = req.query.query;
        let results;
        if (!searchTerm || searchTerm.trim() === "") {
          // No query provided – fetch all admin users
          results = await User.find({ isAdmin: true });  // returns all admins
        } else {
          // Query provided – fetch admin users matching the search term
          const term = searchTerm.trim();
          const regex = new RegExp(term, "i");  // case-insensitive regex for matching
          results = await User.find({ 
            isAdmin: true,
            $or: [ 
              { username: regex }, 
              { email: regex }, 
              { name: regex } 
            ] 
          });
          // ^ The fields used in $or should be those that make sense to search by.
        }
        return res.json(results);
      } catch (err) {
        console.error("Error in /search-candidates:", err);
        res.status(500).json({ error: "Internal server error" });
      }
});

app.get('/manage-preferences', (req, res) => {
    res.render('manage-preferences');
});



app.get('/adminSearch', async (req, res) => {
    try {
        const profiles = await Profile.find({}, 'user_id');
        const userIds = profiles.map(profile => profile.user_id);
        const users = await User.find({ _id: { $in: userIds } }, 'first_name last_name created_at last_login');
        const filteredUsers = users.filter(user => user.isAdmin); // only admins
        users.forEach(user => {
            user.formattedCreatedAt = moment(user.created_at).format('MMMM YYYY');
            user.formattedLastLogin = moment(user.last_login).format('MMMM YYYY');
          });
        res.render('adminSearch', { users: filteredUsers }); // Render the 'adminSearch.ejs' view and pass profiles
    } catch (error) { 
        console.error('Error fetching profiles:', error);
        res.status(500).send('Error fetching candidates');
    }
    
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
});

app.put('/api/users/:id/role', async (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;

    try {
        const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.json({ message: 'User role updated successfully', user });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).send('Error updating user role');
    }
});


// Deactivate a user
app.put('/api/users/:id/deactivate', async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findByIdAndUpdate(userId, { status: 'inactive' }, { new: true });
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.json({ message: 'User deactivated successfully', user });
    } catch (error) {
        console.error('Error deactivating user:', error);
        res.status(500).send('Error deactivating user');
    }
});

// Update an existing job
/*app.post('/api/jobs/:id/update', async (req, res) => {
    const jobId = req.params.id;
    const { title, description, requirements, client_name, location, job_type } = req.body;

    try {
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            {
                title,
                description,
                requirements: requirements ? requirements.split(',').map(req => req.trim()) : [], // Ensure it's an array
                client_name,
                location,
                job_type,
            },
            { new: true }
        );
        if (!updatedJob) {
            return res.status(404).send('Job not found');
        }
        res.redirect('/job-postings');
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).send('Error updating job');
    }
});*/

// Delete a job
/*app.post('/api/jobs/:id/delete', async (req, res) => {
    const jobId = req.params.id;

    try {
        const deletedJob = await Job.findByIdAndDelete(jobId);
        if (!deletedJob) {
            return res.status(404).send('Job not found');
        }
        res.redirect('/job-postings');
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).send('Error deleting job');
    }
});*/

// Serve index.ejs for /
app.get('/', (req, res) => {
    const email = req.cookies.email || ''; // Pre-fill email if "Remember Me" was checked
    res.render('index.ejs', { email });
});

app.get('/schedule-event.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'schedule-event.html'));
});

app.get('/user_dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'user_dashboard.html'));
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

app.get('/api/events', async (req, res) => {
    const userId = req.session.userId; // Ensure the user is logged in
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const events = await Event.find({ user_id: userId }); // Fetch events for the logged-in user
        res.json(events); // Return events as JSON
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route for dynamic EJS template
app.get('/manage-users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password for security
        res.render('manage-users', { users }); // Render EJS template and pass user data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error loading manage users page.');
    }
});

// Static route for manage-users.html (if needed for legacy support)
app.get('/manage-users.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'manage-users.html'));
});

/*app.get('/job-postings', async (req, res) => {
    try {
        const jobs = await Job.find(); // Fetch all jobs from the database
        res.render('job-postings', { jobs }); // Pass jobs to EJS template
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Error fetching jobs');
    }
});*/

// Route for create-job-postings 
/*app.get('/create-job-postings', (req, res) => {
    res.render('create-job-postings');
});*/

app.use(express.static(path.join(__dirname, 'html')));

const preferenceRoutes = require('./route/preferences');
app.use('/api/preferences', preferenceRoutes);

// Use preference router for preference-related logic
/*const preferenceRouter = require('./models/preference')({ User }); // Pass User model explicitly
app.use(preferenceRouter);*/

// Add a new job
/*app.post('/api/jobs', async (req, res) => {
    const { title, description, requirements, client_name, location, job_type } = req.body;

    try {
        const newJob = new Job({
            title,
            description,
            requirements: requirements ? requirements.split(',').map(req => req.trim()) : [], // Ensure it's an array
            client_name,
            location,
            job_type,
        });
        await newJob.save();
        res.redirect('/job-postings');
    } catch (error) {
        console.error('Error adding job:', error);
        res.status(500).send('Error adding job');
    }
});*/

app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

app.get('/login', (req, res) => {
    res.render('index', { email: '', invalidCredentials: false });  
});

app.post('/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('index', { 
                email, 
                invalidCredentials: true // Flag for invalid login
            });
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
        console.error('Login error:', error);
        res.render('index', { 
            email, 
            invalidCredentials: true 
        });
    }
});

app.post('/api/schedule-event', async (req, res) => {
    const { email, title, date, time, location } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Save event details in the database
        const newEvent = new Event({
            user_id: user._id,
            title,
            date,
            time,
            location,
        });

        await newEvent.save();

        res.status(200).json({ message: 'Event scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling event:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Save preferences logic 
app.post('/api/save-preferences', async (req, res) => {
    const userId = req.session.userId;
    console.log('Session userId:', userId);

    const { preferences } = req.body;  // Get preferences from request body
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const profile = await Profile.findOne({ user_id: userId });
        console.log('Profile fetched:', profile);

        if (!profile) {
            return res.status(404).send('User profile not found');
        }

        // Replace existing preferences with the new ones
        profile.preferences = preferences.map(job => ({
            title: job.title,
            location: job.location,
            job_type: job.job_type,
        }));

        await profile.save();  // Save the updated profile

        res.status(200).send('Preferences saved successfully');
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).send('An error occurred while saving preferences');
    }
});

// Handle /signup2 POST request
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

        // Check if a profile already exists for this user
        const existingProfile = await Profile.findOne({ user_id: userId });

        if (existingProfile) {
            // Update the existing profile
            existingProfile.education.push({ degree }); // Add the new degree
            existingProfile.resume_url = s3Response.Location;
            existingProfile.status = "active";
            await existingProfile.save();
        } else {
            // Create a new profile if none exists
            const newProfile = new Profile({
                user_id: userId,
                full_name: fullName,
                education: [{ degree }],
                resume_url: s3Response.Location,
                status: "active",
            });
            await newProfile.save();
        }

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

//search.ejs deletion logic
app.post('/delete-candidates', async (req, res) => {
    const { selectedCandidates } = req.body;

    if (!selectedCandidates || selectedCandidates.length === 0) {
        return res.status(400).json({ message: "No candidates selected for deletion." });
    }

    try {
        await User.deleteMany({ _id: { $in: selectedCandidates } });
        res.status(200).json({ message: "Candidates deleted successfully." });
    } catch (error) {
        console.error("Error deleting candidates:", error);
        res.status(500).json({ message: "Error deleting candidates." });
    }
});

app.get('/settings.html', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect('/index.html'); // Redirect to login if not logged in
    }

    try {
        const user = await User.findById(userId);
        const profile = await Profile.findOne({ user_id: userId });

        if (!user || !profile) {
            return res.status(404).send('User or profile not found');
        }

        // Pass the current user's data to the settings page
        res.render('settings', {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            degree: profile.education.length > 0 ? profile.education[0].degree : '', // Check if degree exists
            resume_url: profile.resume_url, // Show current resume URL if available
            zipcode: profile.zipcode || '', // Include the current zipcode
        });
    } catch (error) {
        console.error('Error fetching user or profile:', error);
        res.status(500).send('Error fetching profile');
    }
});

// Handle /settings.html POST request
app.post('/submit_settings', upload.single('resume'), async (req, res) => {
    const userId = req.session.userId; // Ensure the user is logged in
    const { first_name, last_name, email, zipcode, degree } = req.body; // Extract inputs from the form
    const file = req.file; // Get the uploaded resume file

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

        // Find the associated profile
        const profile = await Profile.findOne({ user_id: userId });

        if (!profile) {
            return res.status(404).send('User profile not found');
        }

        // Update the profile fields
        profile.full_name = `${first_name} ${last_name}`;
        profile.education = [{ degree }];
        profile.zipcode = zipcode; // Assuming you want to save zipcode in the profile as well

        // If a resume is uploaded, upload it to S3 and update the profile
        if (file) {
            const s3Params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `resumes/${Date.now()}-${file.originalname}`,
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            const s3Response = await s3.upload(s3Params).promise();
            profile.resume_url = s3Response.Location; // Update the resume URL in the profile
        }

        await profile.save(); // Save the updated profile

        res.redirect('/preferences.html'); // Redirect back to preferences page
    } catch (error) {
        console.error('Error updating user or profile information:', error);
        res.status(500).send('An error occurred while updating your information');
    }
});

app.post('/signup', async (req, res) => {
    const { first_name, last_name, username, email, password, confirm_password } = req.body;

    // Password validation function
    function isValidPassword(password) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    }

     // Error message variables
     let errorMessages = {
        passwordError: '',
        matchError: ''
    };

    // Check if passwords match
    if (password !== confirm_password) {
        errorMessages.matchError = 'Passwords do not match.';
    }

    // Validate password strength
    if (!isValidPassword(password)) {
        errorMessages.passwordError = 'Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.';
    }

    if (errorMessages.passwordError || errorMessages.matchError) {
        return res.redirect(`/signup.html?passwordError=${encodeURIComponent(errorMessages.passwordError)}&matchError=${encodeURIComponent(errorMessages.matchError)}`);
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('User with this email already exists.');
        }

        // Create a new user
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        const newUser = new User({
            first_name,
            last_name,
            username,
            email,
            password: hashedPassword, // Save the hashed password
        });

        await newUser.save(); // Save the user in the database

        // Automatically create a corresponding profile for the user
        const newProfile = new Profile({
            user_id: newUser._id, // Associate with the new user
            full_name: `${first_name} ${last_name}`,
            preferences: [], // Initialize preferences as an empty array
            experience: [],
            skills: [],
            education: [],
            status: 'active',
        });

        await newProfile.save(); // Save the profile in the database

        console.log('Profile created successfully for user:', newUser.username);

        // Redirect or send a success response
        res.redirect('/index.html'); // Redirect to the login page
    } catch (error) {
        console.error('Error during user signup:', error);
        res.status(500).send('Internal server error');
    } 
});

// Reschedule an event
app.post('/api/request-reschedule', async (req, res) => {
    try {
        const { eventId } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required." });
        }

        // You can modify this to store the request in a database
        console.log(`Reschedule request received for Event ID: ${eventId}`);

        // Respond to the client
        res.status(200).json({ message: "Request sent successfully!" });
    } catch (error) {
        console.error("Error processing reschedule request:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// Checking for previous password 
app.post("/password/change", async (req, res) => {
    const { userId, password } = req.body;

    try {
        // Fetch current password hash from database
        const user = await db.getUserById(userId); // Assume getUserById fetches user data
        const currentPasswordHash = user.passwordHash;

        // Compare new password with current password
        const isSamePassword = await bcrypt.compare(password, currentPasswordHash);
        if (isSamePassword) {
            return res.status(400).json({ success: false, error: "previous_password_used" });
        }

        // Hash new password and update it in the database
        const newPasswordHash = await bcrypt.hash(password, 10);
        await db.updatePassword(userId, newPasswordHash); // Assume updatePassword updates user password

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ success: false, error: "server_error" });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = { User, Job, Profile };

