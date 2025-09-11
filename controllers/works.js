const mongoose = require("mongoose");
const express = require('express');
const router = express.Router();
const Work=require("../models/work")
const Composer=require("../models/composer")
const UserWork = require('../models/userWork');
const isSignedIn = require('../middleware/is-signed-in');

//my fav works
router.get('/favorites', isSignedIn, async (req, res) => {
  try {
    const populatedWorks = await Work.find({ favoritedBy: req.session.user._id })
      .populate({
        path: "composer",
        model: "Composer", // force populate with Composer model
        select: "apiId completeName name"
      })
      .sort({ yearComposed: -1 })
      .lean(); // plain JS objects for EJS

    // Debug logging
    populatedWorks.forEach(work => {
      console.log("Work:", work.title);
      console.log("Composer:", work.composer ? work.composer.completeName || work.composer.name : null);
    });

    res.render("works/myFavWorks.ejs", { works: populatedWorks });
  } catch (err) {
    console.error("Error loading favorites:", err);
    res.redirect("/works");
  }
});




//this searches genres and composer 
router.get('/search', async (req, res) => {
  const query = req.query.search; 
  let offset= 0
  // if (!query) {
  //   return res.render("works/index.ejs", { works: [], newWorks: null, genre: null });
  // }
  console.log(req.query)
  if(req.query.offset){
    offset=req.query.offset
  }
  const url = `https://api.openopus.org/omnisearch/${query}/${offset}.json`;
  console.log(url)
  try {
    const data = await (await fetch(url)).json();
    const results = data.results || [];
    

    const works = results
      .filter(r => r.work)
      .map(r => ({
        ...r.work,
        composer: r.composer
      }));
      console.log(works)


    res.render("works/index.ejs", { works, newWorks: null, genre: null, offset, search:req.query.search});
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

//genre and artist 
router.get('/search/genre', async (req, res) => {
  const { composerId, genre } = req.query;
  const url = `https://api.openopus.org/work/list/composer/${composerId}/genre/${genre}.json`;

  try {
    const data = await (await fetch(url)).json();
    const works = data.works || [];

    res.render("works/index.ejs", { works, genre,offset: 0, search: null });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});




///edit
router.get('/:workId/edit', isSignedIn, async (req, res) => {
  try {
    const work = await Work.findOne({ apiId: req.params.workId });
    if (!work) return res.status(404).send('Composer not found');

    let userWork = await UserWork.findOne({
      user: req.session.user._id,
      work: work._id,
    });

    if (!userWork) {
  userWork = await UserWork.create({
    user: req.session.user._id,
    work: work._id,
    notes: '',
    youTube: ''
  });
}


    res.render('works/edit.ejs', { work, userWork });
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// show page but not for myfavs 
router.get('/:workId', async (req, res) => {
    const baseUrl = `https://api.openopus.org/work/detail/${req.params.workId}.json`;
    console.log(baseUrl)

  try {
    const data= await (await fetch(baseUrl)).json()
    const work = data.work
    const composer=data.composer
    work.apiId= work.id
    const w= await Work.findOne({apiId:work.id})
    if (!w) {
  let c = await Composer.findOne({ apiId: composer.id });
  if (!c) {
    const composerData = {
      apiId: composer.id,
      name: composer.name,
      completeName: composer.complete_name,
      epoch: composer.epoch,
      birthYear: composer.birth ? new Date(composer.birth).getFullYear() : null,
      deathYear: composer.death ? new Date(composer.death).getFullYear() : null,
      portrait: composer.portrait || null,
    };

    const newComposer = await Composer.create(composerData);
    work.composer = newComposer._id;
    c = newComposer;
  } else {
    work.composer = c._id;
  }

  work.apiId = work.id;
  const newWork = await Work.create(work);
  let populated = await Work.findById(newWork._id).populate("composer");
  res.render("works/show.ejs", { work: populated, genre: populated.genre, user: req.session.user });
} else {
  let populated = await Work.findById(w._id).populate("composer");
  res.render("works/show.ejs", { work: populated, genre: populated.genre, user: req.session.user });
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

// create the fav list
router.post('/:workId/favorites', isSignedIn, async (req, res) => {
  const work = await Work.findOne({ apiId: req.params.workId });
  if (!work) return res.redirect('/works');

  const userId = new mongoose.Types.ObjectId(req.session.user._id);

  if (!work.favoritedBy.some(id => id.equals(userId))) {
    work.favoritedBy.push(userId);
  } else {
    work.favoritedBy = work.favoritedBy.filter(id => !id.equals(userId));
  }

  await work.save();
  res.redirect(`/works/${req.params.workId}`);
});


///updating
router.put('/:workId', async (req, res) => {
  try {
    // Build updates object based on your Work schema
    const updates = {
      title: req.body.title,
      subtitle: req.body.subtitle || '',
      searchterms: req.body.searchterms || '',
      popular: req.body.popular || '0',
      recommended: req.body.recommended || '0',
      genre: req.body.genre || '',
      composer: req.body.composer || null, 
      yearComposed: req.body.yearComposed || null,
      catalogueSystem: req.body.catalogueSystem || '',
      catalogueNumber: req.body.catalogueNumber || '',
      youTube: req.body.youTube || '',
    };

    // Ensure apiId never changes (but we can use it to find the work)
    const work = await Work.findOneAndUpdate(
      { apiId: req.params.workId },
      updates,
      { new: true }
    );

    if (!work) {
      return res.status(404).send('Work not found');
    }

    // user notes if they exist
   if (req.body.notes !== undefined || req.body.youTube !== undefined) {
  await UserWork.findOneAndUpdate(
    { user: req.session.user._id, work: work._id },
    {
      notes: req.body.notes || '',
      youTube: req.body.youTube || ''
    },
    { upsert: true, new: true }
  );
}

    res.redirect(`/works/${work.apiId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});




//individual's list

module.exports = router;