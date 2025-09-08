// models/composer.js
const mongoose = require('mongoose');

const composerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  birthyear: {
    type: Number,
    required: true,
  },
  deathyear: {
    type: Number,
  },
  nationality: {
    type: String,
    required: true,
  },
  biography: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Composer', composerSchema);
