const express = require('express');
const router = express.Router();
const Composer=require("../models/composer")

//open 
router.get('/', async (req, res) => {
  try {
    const composers = await Composer.find({});
    res.render('composers/index.ejs', {
      composers,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});


//individual's list

module.exports = router;