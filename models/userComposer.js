const mongoose = require('mongoose');

const userComposerSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  composer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Composer', 
    required: true 
  },
  notes: { 
    type: String 
  }
}, { timestamps: true });

module.exports = mongoose.model('UserComposer', userComposerSchema);
