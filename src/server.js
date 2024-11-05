const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const bcrypt = require('bcrypt'); //bcrypt for password hashing

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CONNECTION = process.env.CONNECTION;

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    first_name: String,  // Add first name
    last_name: String,   // Add last name
    created_at: { type: Date, default: Date.now }  // Add timestamp
});

const User = mongoose.model('User', userSchema, 'users');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'html')));

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'signup.html'));
});

app.post('/signup.html', async (req, res) => {
    const { email, password, first_name, last_name } = req.body;

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, first_name, last_name });

    try {
        await newUser.save();
        res.redirect('/index.html');
    } catch (error) {
        console.error(error);
        res.status(400).send('User already exists or an error occurred');
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
