const express = require('express');
const router = express.Router();
const Composer=require("../models/composer")
const UserComposer = require('../models/userComposer');
const isSignedIn = require('../middleware/is-signed-in');


///experiment
// NEW composer form
router.get('/new', isSignedIn, (req, res) => {
  res.render('composers/new.ejs'); 
});

// CREATE composer (manual add, not API)
router.post('/', isSignedIn, async (req, res) => {
  try {
    const composer = await Composer.create({
      name: req.body.name,
      completeName: req.body.completeName,
      epoch: req.body.epoch,
      birthYear: req.body.birthYear,
      deathYear: req.body.deathYear || null,
      portrait: req.body.portrait || null,
      source: "local" 
    });
    res.redirect(`/composers/${composer._id}`); 
  } catch (err) {
    console.error(err);
    res.redirect('/composers');
  }
});


//my fav composers
router.get('/favorites', isSignedIn, async (req, res) => {
  console.log("hello")
  const populatedComposers = await Composer.find({favoritedBy: req.session.user._id});
  try {
    res.render('composers/myFavComposers.ejs', {
      composers: populatedComposers,
    });
  } catch (err) {
    console.log(err);
    res.redirect('/composers');
  }
});

//this searches specific composer 
router.get('/search', async (req, res) => {
    const baseUrl=`https://api.openopus.org/composer/list/search/${req.query.search}.json`
  try {
    const data= await (await fetch(baseUrl)).json()
    const composer = data.composers[0]
    composer.apiId= composer.id
    composer.birthYear= new Date (composer.birth).getFullYear()
    composer.deathYear= new Date (composer.death).getFullYear()
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
      completeName: c.complete_name,
      birthYear: new Date (c.birth).getFullYear(),
      deathYear: new Date (c.death).getFullYear()
    }))

    res.render("composers/index", { composers, newComposer: null, epoch: req.query.search })

  } catch (err) {
    console.log(err)
    res.redirect('/')
  }
})

///edit
router.get('/:composerId/edit', isSignedIn, async (req, res) => {
  try {
    const composer = await Composer.findOne({ apiId: req.params.composerId });
    if (!composer) return res.status(404).send('Composer not found');

    let userComposer = await UserComposer.findOne({
      user: req.session.user._id,
      composer: composer._id,
    });

    if (!userComposer) {
      userComposer = await UserComposer.create({
        user: req.session.user._id,
        composer: composer._id,
        notes: '',
      });
    }

    res.render('composers/edit.ejs', { composer, userComposer });
  } catch (err) {
    res.status(500).send(err.message);
  }
});



// show page but not for myfavs 
router.get('/:composerId', async (req, res) => {
  try {
    const { composerId } = req.params;
    let composer, works;
    //this gets complicated because i'm trying to make sure the composer really shows up
    if (/^[0-9a-fA-F]{24}$/.test(composerId)) {
      // It's a MongoDB _id--it has letters
      composer = await Composer.findById(composerId);
      if (!composer) return res.redirect('/');

      const worksRes = await fetch(
        `https://api.openopus.org/work/list/composer/${composer.apiId}/genre/Popular.json`
      );
      const worksData = await worksRes.json();
      works = worksData.works || [];

    } else {
      // It's an OpenOpus API id--no letters
      const baseUrl = `https://api.openopus.org/composer/list/ids/${composerId}.json`;
      const data = await (await fetch(baseUrl)).json();
      if (!data.composers || !data.composers.length) return res.redirect('/');

      const apiComposer = data.composers[0];

      // update or insert the local copy
      composer = await Composer.findOneAndUpdate(
        { apiId: apiComposer.id },
        {
          $set: { ///only change the fields i'm giving you
            name: apiComposer.name,
            completeName: apiComposer.complete_name,
            birthYear: new Date(apiComposer.birth).getFullYear(),
            deathYear: new Date(apiComposer.death).getFullYear(),
            epoch: apiComposer.epoch || null,
            portrait: apiComposer.portrait || null
          }
        },
        { new: true, upsert: true }
      );

      // fetch by saved ID--safety
      const worksRes = await fetch(
        `https://api.openopus.org/work/list/composer/${composer.apiId}/genre/Popular.json`
      );
      const worksData = await worksRes.json();
      works = worksData.works || [];
    }

    res.render("composers/show.ejs", { 
      composer, 
      epoch: composer.epoch, 
      works, 
      user: req.session.user 
    });

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
router.post('/:composerId/favorites', isSignedIn, async (req, res) => {
  const composer= await Composer.findOne({apiId:req.params.composerId})
  console.log(composer)
  if(!composer.favoritedBy.includes(req.session.user._id)){
    composer.favoritedBy.push(req.session.user._id)
    await composer.save()
  } else{
    composer.favoritedBy.remove(req.session.user._id)
    await composer.save()
  } 
  // req.body.favoritedBy = req.session.user._id;
  // await Composer.create(req.body);
    res.redirect(`/composers/${req.params.composerId}`);
});



///updating

router.put('/:composerId', async (req, res) => {
  try {
        const updates = {
      name: req.body.name,
      completeName: req.body.completeName,
      sex: req.body.sex || null,
      epoch: req.body.epoch,
      birthYear: req.body.birthYear,
      deathYear: req.body.deathYear || null,
      nationality: req.body.nationality || null,
      biography: req.body.biography || null,
    };

    if (req.body.portrait && req.body.portrait.trim() !== '') {
      updates.portrait = req.body.portrait.trim();
    }


    const composer = await Composer.findOneAndUpdate(
      { apiId: req.params.composerId },
      updates,
      { new: true }
    );

    if (!composer) {
      return res.status(404).send('Composer not found');
    }

    if (req.body.notes !== undefined) {
      await UserComposer.findOneAndUpdate(
        { user: req.session.user._id, composer: composer._id },
        { notes: req.body.notes },
        { upsert: true }
      );
    }


    res.redirect(`/composers/${composer.apiId}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});



//individual's list

module.exports = router;