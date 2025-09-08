// models/user.js

const collectionSchema = new mongoose.Schema({
  composers: {
    type: String,
    required: true,
  },
  works: {
    type: String,
    required: true,
  },

});


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  applications: [collectionSchema], // embed collectionSchema here
});

module.exports = mongoose.model('User', userSchema);
