const express = require('express');
const router = express.Router();
const Composer=require("../models/composer")

//this searches specific composer 
router.get('/search', async (req, res) => {
    const baseUrl=`https://api.openopus.org/composer/list/search/${req.query.search}.json`
  try {
    const data= await (await fetch(baseUrl)).json()
    const composer = data.composers[0]
    composer.apiId= composer.id
    composer.completeName=composer.complete_name
    const c= await Composer.findOne({apiId:composer.id})
    if(!c){
        const newComposer= await Composer.create(composer)
        res.render("composers/index.ejs", {newComposer, composers:null})
      }else{

        res.render("composers/index.ejs", {newComposer:c, composers:null})
      }

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});


//this searches epoch 
router.get('/search/epoch', async (req, res) => {
  console.log(req.query.epoch)
  const baseUrl = `https://api.openopus.org/composer/list/epoch/${req.query.epoch}.json`

  try {
    const response = await fetch(baseUrl)
    const data = await response.json()

    const composers = data.composers.map(c => ({
      ...c,
      apiId: c.id,
      completeName: c.complete_name
    }))

    console.log(composers)
    console.log("Normalized composers:", composers.map(c => c.apiId))


    res.render("composers/index", { composers, newComposer: null })

  } catch (err) {
    console.log(err)
    res.redirect('/')
  }
})


// show page but not for myfavs 
router.get('/:composerId', async (req, res) => {
    const baseUrl = `https://api.openopus.org/composer/list/ids/${req.params.composerId}.json`;

  try {
    const data= await (await fetch(baseUrl)).json()
    const composer = data.composers[0]
    composer.apiId= composer.id
    composer.completeName=composer.complete_name
    const c= await Composer.findOne({apiId:composer.id})
    if (!c) {
  const newComposer = await Composer.create(composer)
  res.render("composers/show.ejs", { composer: newComposer })
} else {
  res.render("composers/show.ejs", { composer: c })
}

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});





// // Create Route: Handles the submission of the new author form
// router.post('/', async (req, res) => {
//   try {
//     const newWork = await Work.create({ name: req.body.name });
//     res.redirect('/works');
//   } catch (error) {
//     console.error('error saving work:', error);
//     res.redirect('/');
//   }
// });

//create the fav list
router.post('/favorites', async (req, res) => {
  req.body.favoritedBy = req.session.user._id;
  await Composer.create(req.body);
  res.redirect('/');
});


//my fav composers
router.get('/favorites', async (req, res) => {
  try {
    const populatedComposers = await Composer.find({favoritedBy: req.session.user._id}).populate('favoritedBy');
    res.render('composers/myFavComposers.ejs', {
      composers: populatedComposers,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});



//individual's list

module.exports = router;