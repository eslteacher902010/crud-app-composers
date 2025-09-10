const mongoose = require('mongoose');

const userWorkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',   
    required: true,
  },
  work: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work',   
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  youTube: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('UserWork', userWorkSchema);
