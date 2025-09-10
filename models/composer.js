// models/composer.js
const mongoose = require('mongoose');

const composerSchema = new mongoose.Schema({
  apiId: {
    type: String,
    required: true,
  },  
  name: {
    type: String,
  
  },
  completeName: {
    type: String,
    required: true,
  },
   portrait: {
    type: String,
  },
 sex : {
    type: String,
  },
 epoch : {
    type: String,
    required: true,
  },
  birthYear: {
    type: String,
    required: true,
  },
  deathYear: {
    type: String,
  },
  nationality: {
    type: String,
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
