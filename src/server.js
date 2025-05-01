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
const Preference = mongoose.model('Preference', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}), 'preferences');
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
    email: { type: String, unique: true, required: true},
    username: { type: String },
    password: String,
    first_name: String,
    last_name: String,
    role: { type: String, default: 'candidate' },
    isAdmin: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    last_login: Date,
    resetCode: String, 
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
    resetCode: { type: String },
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

    const API_URL = "https://api.camelcase-preprod.com/email/send";
    const API_KEY = "rlFQMGqpw72w4NnytZBapaLsFnc2WaQH1mrTZ0un";

    const requestData = {
        toAddress: recipient,
        subject: subject,
        body: message
    };

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
        console.log("Response from external API:", data);

        if (response.ok) {
            res.json({ message: 'Email sent successfully' });
        } else {
            res.status(500).json({ message: 'Failed to send email' });
        }
    } catch (error) {
        console.error("Error sending email:", error.message);
        res.status(500).json({ message: 'Failed to send email' });
    }
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
        //const candidates = await User.find({ isAdmin: false });
        const users = await User.find({ _id: { $in: userIds }, isAdmin: false }, 'first_name last_name email created_at last_login');
        const filteredUsers = users.filter(user => !user.isAdmin); // Exclude admins
        users.forEach(user => {
            user.formattedCreatedAt = moment(user.created_at).format('MMMM YYYY');
            user.formattedLastLogin = moment(user.last_login).format('MMMM YYYY');
          });
        res.render('search', { users: users }); // Render the 'search.ejs' view and pass profiles
    } catch (error) { 
        console.error('Error fetching profiles:', error);
        res.status(500).send('Error fetching candidates');
    }
});


app.get('/search-candidates', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.json([]);
    }

    try {
        const profiles = await Profile.find({}, 'user_id');
        const userIds = profiles.map(profile => profile.user_id);

        const users = await User.aggregate([
            { $match: { _id: { $in: userIds } } },
            {
                $addFields: {
                    full_name: { $concat: ["$first_name", " ", "$last_name"] }
                }
            },
            {
                $match: {
                    $and: [
                        { isAdmin: { $ne: true } },
                        {
                            $or: [
                                { full_name: { $regex: query, $options: 'i' } },
                                { email: { $regex: query, $options: 'i' } },
                                { first_name: { $regex: query, $options: 'i' } },
                                { last_name: { $regex: query, $options: 'i' } }
                            ]
                        }
                    ]
                }
            },
            {
                $project: {
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                    created_at: 1,
                    last_login: 1
                }
            }
        ]);

        // Add formatted dates in JS
        users.forEach(user => {
            user.formattedCreatedAt = moment(user.created_at).format('MMMM YYYY');
            user.formattedLastLogin = moment(user.last_login).format('MMMM YYYY');
        });

        res.json(users);
    } catch (error) {
        console.error('Error searching candidates:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/search-admins', async (req, res) => {
    try {
        const searchTerm = req.query.query;
        let admins;

        if (!searchTerm || searchTerm.trim() === "") {
            admins = await User.find({ isAdmin: true }).lean();
        } else {
            const term = searchTerm.trim();
            const regex = new RegExp(term, "i");

            admins = await User.aggregate([
                { $match: { isAdmin: true } },
                {
                    $addFields: {
                        full_name: { $concat: ["$first_name", " ", "$last_name"] }
                    }
                },
                {
                    $match: {
                        $or: [
                            { first_name: regex },
                            { last_name: regex },
                            { email: regex },
                            { full_name: regex }
                        ]
                    }
                },
                {
                    $project: {
                        first_name: 1,
                        last_name: 1,
                        email: 1,
                        created_at: 1,
                        last_login: 1
                    }
                }
            ]);
        }

        admins.forEach(admin => {
            admin.formattedCreatedAt = moment(admin.created_at).format('MMMM YYYY');
            admin.formattedLastLogin = moment(admin.last_login).format('MMMM YYYY');
        });

        return res.json(admins);
    } catch (err) {
        console.error("Error in /search-admins:", err);
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
/*
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
*/


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

/*
const preferenceRoutes = require('./route/preferences');
app.use('/api/preferences', preferenceRoutes);
*/

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


//manage_preference.ejs backend logic
// Enhanced preferences route with emails
app.get('/api/preferences', async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const preferences = await Preference.find({
            name: { $regex: search, $options: 'i' }
        }).skip(skip).limit(limit).lean();

        const preferenceNames = preferences.map(pref => pref.name);

        const userCounts = await Profile.aggregate([
            { $unwind: "$preferences" },
            { $match: { preferences: { $in: preferenceNames } } },
            { $group: { _id: "$preferences", count: { $sum: 1 } } }
        ]);

        const countMap = {};
        userCounts.forEach(entry => {
            countMap[entry._id] = entry.count;
        });

        const preferencesWithCounts = preferences.map(pref => ({
            ...pref,
            userCount: countMap[pref.name] || 0
        }));

        res.json({ preferences: preferencesWithCounts });

    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Preferences Routes (Moved from routes/preferences.js) ---

// Create a new preference
app.post('/api/preferences', async (req, res) => {
    try {
        const { name } = req.body;

        const existing = await Preference.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Preference already exists' });
        }

        const preference = new Preference({ name: name.trim() });
        await preference.save();
        res.status(201).json(preference);
    } catch (error) {
        console.error('Error creating preference:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a preference by ID
app.put('/api/preferences/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const existingPreference = await Preference.findById(id);
        if (!existingPreference) {
            return res.status(404).json({ message: 'Preference not found' });
        }

        const oldName = existingPreference.name; // Save the old name

        // Update the Preference document
        existingPreference.name = name.trim();
        await existingPreference.save();

        // Now update all user profiles that had the old preference
        await Profile.updateMany(
            { preferences: oldName },
            { $set: { "preferences.$": name.trim() } }
        );

        res.json({ message: 'Preference updated and profiles cleaned.' });
    } catch (error) {
        console.error('Error updating preference:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Delete multiple preferences
app.delete('/api/preferences', async (req, res) => {
    try {
        const { ids } = req.body; // expects: { ids: ["id1", "id2", ...] }

        // Find the names of the preferences we are deleting
        const preferencesToDelete = await Preference.find({ _id: { $in: ids } }).lean();
        const namesToDelete = preferencesToDelete.map(pref => pref.name);

        // Delete the preferences themselves
        const result = await Preference.deleteMany({ _id: { $in: ids } });

        // Now clean up user profiles: remove any deleted preferences from their preferences array
        await Profile.updateMany(
            {},
            { $pull: { preferences: { $in: namesToDelete } } }
        );

        res.json({ message: `Deleted ${result.deletedCount} preferences and cleaned user profiles.` });
    } catch (error) {
        console.error('Error deleting preferences:', error);
        res.status(500).json({ message: 'Server error' });
    }
});






app.get('/preferences', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).send('Unauthorized');
    }
  
    try {
      const profile = await Profile.findOne({ user_id: req.session.userId });
      const savedPreferences = profile ? profile.preferences : [];
  
      res.render('preferences', {
        savedPreferences: JSON.stringify(savedPreferences) // pass as JSON string
      });
    } catch (err) {
      console.error('Error loading preferences:', err);
      res.status(500).send('Server error');
    }
  });

// Save preferences logic 
app.post('/api/save-preferences', async (req, res) => {
    const userId = req.session.userId;
    const { preferences } = req.body;
  
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }
  
    try {
      const profile = await Profile.findOne({ user_id: userId });
  
      if (!profile) {
        return res.status(404).send('User profile not found');
      }
  
      // Clean duplicates and extra spaces
      const uniquePreferences = [...new Set(preferences.map(p => p.name.trim()))];
  
      profile.preferences = uniquePreferences;
      await profile.save();
  
      res.status(200).send('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).send('An error occurred while saving preferences');
    }
  });

  app.get('/api/email-preferences', async (req, res) => {
    try {
        const search = req.query.search || '';
        // Step 1: Find all preference names matching the search
        const preferences = await Preference.find({
            name: { $regex: search, $options: 'i' }
        }).lean();

        const preferenceNames = preferences.map(p => p.name);

        // Step 2: Aggregate user counts and emails from profiles
        const results = await Profile.aggregate([
            { $match: { preferences: { $in: preferenceNames } } },
            { $unwind: "$preferences" },
            { $match: { preferences: { $in: preferenceNames } } },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $group: {
                    _id: "$preferences",
                    userCount: { $sum: 1 },
                    emails: { $addToSet: "$user.email" }
                }
            }
        ]);

        // Step 3: Merge counts + emails back into preference objects
        const data = preferences.map(pref => {
            const match = results.find(r => r._id === pref.name);
            return {
                name: pref.name,
                userCount: match?.userCount || 0,
                emails: match?.emails || [] // use first email if multiple
            };
        });

        res.json({ preferences: data });






    } catch (error) {
        console.error("Error fetching preferences with emails:", error);
        res.status(500).json({ error: "Server error" });
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

//admin role logic for search.ejs
app.put('/api/users/:id/role', async (req, res) => {
    const userId = req.params.id;
    const { role, isAdmin } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { role, isAdmin }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json({ message: "User promoted successfully." });
    } catch (error) {
        console.error("Error promoting user:", error);
        res.status(500).json({ message: "Error promoting user." });
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

// Change password (FORGOT FLOW)
app.post('/api/change-password', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Optional: Check if resetCode is still set
        if (user.resetCode) {
            return res.status(400).json({ success: false, message: 'Reset code still active. Please validate it first.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear any lingering reset-related fields
        user.resetCode = undefined; // Already cleared during verification, but just in case
        await user.save();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = { User, Job, Profile };



// Assign reset code to a user
app.post('/api/reset-code', async (req, res) => {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
        return res.status(400).json({ message: 'Email and reset code are required.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.resetCode = resetCode; // Save the reset code
        await user.save();

        res.status(200).json({ message: 'Reset code assigned successfully.' });
    } catch (error) {
        console.error('Error assigning reset code:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// Verify the reset code
app.post('/api/verify-reset-code', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user || !user.resetCode) {
            return res.status(400).json({ success: false, message: 'No reset code found.' });
        }

        if (String(user.resetCode) !== String(code)) {
            return res.status(400).json({ success: false, message: 'Invalid reset code.' });
        }

        // Reset code matches — clear it now
        user.resetCode = undefined;
        await user.save();

        return res.status(200).json({ success: true, message: 'Code verified successfully.' });
    } catch (error) {
        console.error('Error verifying reset code:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});