const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');



const authController = require('./controllers/auth');
const userController = require('./controllers/auth.js');
const composerController = require('./controllers/composers');
const workController = require('./controllers/works');

const isSignedIn = require('./middleware/is-signed-in.js');
const passUserToView = require('./middleware/pass-user-to-view.js');

const port = process.env.PORT ? process.env.PORT : '3000';

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
// middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

  app.use(function(req, res, next) {
        res.locals.user = req.session.user; // Assuming 'user' is where your user object is stored in the session
        next();
    });

app.use(express.static('public'));
app.set('view engine', 'ejs');

// make user available in views
app.use(passUserToView);

// homepage
app.get('/', (req, res) => {
  res.render('index.ejs', {
    user: req.session.user,
  });
});

// controllers
app.use('/auth', authController);
app.use('/users', userController);
app.use('/composers', composerController);
app.use('/works', workController);

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
