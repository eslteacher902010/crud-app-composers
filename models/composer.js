// models/composer.js
const mongoose = require('mongoose');

const composerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
   image: {
    type: String,
    required: false,
  },
 sex : {
    type: String,
    required: true,
  },
  birthYear: {
    type: Number,
    required: true,
  },
  deathYear: {
    type: Number,
  },
  nationality: {
    type: String,
    required: true,
  },
  biography: {
    type: String,
  },
  favoritedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
}, { timestamps: true });

module.exports = mongoose.model('Composer', composerSchema);
