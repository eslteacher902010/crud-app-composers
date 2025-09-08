// models/work.js
const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['symphony', 'sonata', 'opera', 'concerto', 'other'],
    required: true,
  },
  composer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Composer',
    required: true,
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
}, { timestamps: true });

module.exports = mongoose.model('Work', workSchema);
