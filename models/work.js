// models/work.js
const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
    apiId: {
    type: String,
    required: true,
  },  
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
  },
  searchterms: {
    type: String,
  },
  popular: {
    type: String,
  },
  recommended: {
    type: String,
  },
  
  composer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Composer',
  },
  yearComposed: {
    type: Number,
  },
  catalogueSystem: {
    type: String,
  },
  catalogueNumber: {
    type: String,
  },
  audioFile: {
    type: String, 
  }
}, { timestamps: true });

module.exports = mongoose.model('Work', workSchema);
