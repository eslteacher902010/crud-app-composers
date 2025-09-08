const express = require('express');
const session = require('express-session');
const app = express();

const authController = require('./controllers/auth');
const userController = require('./controllers/users');
const composerController = require('./controllers/composers');
const workController = require('./controllers/works');

const isSignedIn = require('./middleware/is-signed-in.js');
const passUserToView = require('./middleware/pass-user-to-view.js');

// middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

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
