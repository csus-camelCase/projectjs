const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const app = express();



const PORT = process.env.PORT || 3000;
const CONNECTION = process.env.CONNECTION;

const loginSchema = new mongoose.Schema({
    email: {type: String, unique: true},
    password: String,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
const Candidate = mongoose.model('Candidate', loginSchema);
app.use(express.static(path.join(__dirname, 'html')));


app.get('/index.html', (req, res) => {
    res.render('/index.html');
});

app.get('/signup.html', (req, res) => {
    res.render('/signup.html');
});

app.post('/signup.html', async (req, res) => {    
    const { email, password } = req.body;

    const newUser = new Candidate({email, password});
    try{
        await newUser.save();
        res.redirect('/index.html');
    } catch (error){
        res.status(400).send('User already exists');
    }
});


const start = async() => {
    try{
    
        await mongoose.connect(CONNECTION); {
            app.listen(PORT, () => {
                console.log(`Server is running at http://localhost:${PORT}`);
            });
        } 

    } catch(err){
        console.log(err.message)
    }
} 

start();



