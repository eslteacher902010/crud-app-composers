const dotenv = require('dotenv');
dotenv.config();
const expressLayouts = require('express-ejs-layouts');
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');

if (!global.fetch) {
  global.fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

// controllers
const authController = require('./controllers/auth');
const composerController = require('./controllers/composers');
const workController = require('./controllers/works');

// middleware
const isSignedIn = require('./middleware/is-signed-in.js');
const passUserToView = require('./middleware/pass-user-to-view.js');

const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// core middleware
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// make user available globally
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// static files + EJS layouts
app.use(express.static('public'));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout'); // uses views/layout.ejs by default

// custom middleware
app.use(passUserToView);

// default locals middleware (title + wallpaper class)
app.use((req, res, next) => {
  res.locals.title = "Classical DB"; // default title
  res.locals.bodyClass = "";         // default body class so it's always defined
  next();
});

// homepage
app.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user,
    title: 'Home | Classical DB', // optional override
  });
});

// Sign In
app.get('/auth/sign-in', (req, res) => {
  res.render('auth/sign-in', { 
    title: "Sign In | Classical DB",
    bodyClass: "treble"   // wallpaper class
  });
});

// Sign Up
app.get('/auth/sign-up', (req, res) => {
  res.render('auth/sign-up', { 
    title: "Sign Up | Classical DB",
    bodyClass: "treble"   // wallpaper class
  });
});




// controllers
app.use('/auth', authController);
app.use('/composers', composerController);
app.use('/works', workController);

// start server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
