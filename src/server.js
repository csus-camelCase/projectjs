const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CONNECTION = process.env.CONNECTION;

// Schema with unique constraint on username
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
        password,
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
        if (!user || user.password !== password) {
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
