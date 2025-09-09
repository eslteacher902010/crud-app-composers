const express = require('express');
const router = express.Router();
const Work=require("../models/work")



router.get('/search', async (req, res) => {
    const baseUrl=`https://api.openopus.org/work/list/composer/search/${req.query.search}/genre/all.json` 

  try {
    const data= await (await fetch(baseUrl)).json()
    const work = data.works[0]
    composer.apiId= composer.id
    const c= await Composer.exists({apiId:composer.id})
    if(!c){
        const newComposer= await Composer.create(composer)
    }
    res.render("index.ejs")

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});

// add new work to favorite 
router.get('/new', (req, res) => {
  res.render('works/new',{typeOptions}) 
});


//open all works
router.get('/', async (req, res) => {
  try {
    const works = await Work.find({});
    res.render('works/index.ejs', {
      works,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});

// add new work
router.get('/new', (req, res) => {
  const typeOptions= Work.schema.path("type").enumValues
  console.log(typeOptions)
  res.render('works/new',{typeOptions})  // views/works/new.ejs

});



// Create Route: Handles the submission of the new author form
router.post('/', async (req, res) => {
  try {
    const newWork = await Work.create({ name: req.body.name });
    res.redirect('/works');
  } catch (error) {
    console.error('error saving work:', error);
    res.redirect('/');
  }
});



module.exports = router;