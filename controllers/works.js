const mongoose = require("mongoose");
const express = require('express');
const router = express.Router();
const Work=require("../models/work")
const Composer=require("../models/composer")
const UserWork = require('../models/userWork');
const isSignedIn = require('../middleware/is-signed-in');



///experimental
///new stuff-new work

router.get('/new', isSignedIn, async (req, res) => {
  const composers = await Composer.find();
  res.render('works/new', { composers });
});

//create new work
router.post('/', isSignedIn, async (req, res) => {
  try {

    let composerDoc = null;

    if (req.body.composerId) {
      // First try to find by Mongo _id
      composerDoc = await Composer.findById(req.body.composerId);

      // If not found, try by apiId
      if (!composerDoc) {
        composerDoc = await Composer.findOne({ apiId: req.body.composerId });
      }
    }


    const work = await Work.create({
      title: req.body.title,
      subtitle: req.body.subtitle || '',
      yearComposed: req.body.yearComposed || null,
      catalogueSystem: req.body.catalogueSystem || '',
      catalogueNumber: req.body.catalogueNumber || '',
      genre: req.body.genre || '',
      youTube: req.body.youTube || '',
      composer: composerDoc ? composerDoc._id : null,  
      source: "local" 
    });

    work.apiId = work._id.toString();
    await work.save();


    res.redirect(`/works/${work.apiId}`);
  } catch (err) {
    console.error("Error creating work:", err);
    res.redirect('/works');
  }
});



//my fav works
router.get('/favorites', isSignedIn, async (req, res) => {
  try {
    const populatedWorks = await Work.find({ favoritedBy: req.session.user._id })
      .populate({
        path: "composer",
        model: "Composer",
        select: "apiId completeName name"
      })
      .sort({ yearComposed: -1 });

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

  try { ///for new composer check mongodb

    if (!/^\d+$/.test(req.params.workId)) {
      const localWork = await Work.findOne({ apiId: req.params.workId }).populate("composer");
      if (!localWork) return res.status(404).send("Work not found");
      return res.render("works/show.ejs", { 
        work: localWork, 
        genre: localWork.genre, 
        user: req.session.user 
      });
}

    let localWork = await Work.findOne({ apiId: req.params.workId }).populate("composer");
    if (localWork) {
      return res.render("works/show.ejs", { 
        work: localWork, 
        genre: localWork.genre, 
        user: req.session.user 
      });
    }
    ///make a call to the api above
    const data = await (await fetch(baseUrl)).json();


    if (!data || !data.work || !data.composer) {
      console.error("No work/composer found for", req.params.workId, data);
      return res.redirect('/works');  //still didn't fix it but ...hmmm..come back to this
    }

    const work = data.work;
    const composer = data.composer;

    work.apiId= work.id
    const w= await Work.findOne({apiId:work.id})
    if (!w) {
  let c = await Composer.findOne({ apiId: composer.id });
  if (!c) {
    const composerData = { ///make sure to get all the data before creation --gather the information
      apiId: composer.id,
      name: composer.name,
      completeName: composer.complete_name,
      epoch: composer.epoch,
      birthYear: composer.birth ? new Date(composer.birth).getFullYear() : null,
      deathYear: composer.death ? new Date(composer.death).getFullYear() : null,
      portrait: composer.portrait || null,
    };
    //if there is no composer create the composer in the DB
    const newComposer = await Composer.create(composerData);
    work.composer = newComposer._id;
    c = newComposer;
  } else {
    work.composer = c._id;
  }
  ///now finish creating the word--
  work.apiId = work.id; ///make sure that apiId matches work Id
  const newWork = await Work.create(work);
  let populated = await Work.findById(newWork._id).populate("composer"); // Re-fetch the new work and populate its composer reference
  res.render("works/show.ejs", { work: populated, genre: populated.genre, user: req.session.user });
} else {  // If the work already exists in the DB, just fetch it and populate composer
  let populated = await Work.findById(w._id).populate("composer");
  res.render("works/show.ejs", { work: populated, genre: populated.genre, user: req.session.user });
}

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});





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
    const updates = {
      title: req.body.title,
      subtitle: req.body.subtitle || '',
      genre: req.body.genre || '',
      yearComposed: req.body.yearComposed || null,
      catalogueSystem: req.body.catalogueSystem || '',
      catalogueNumber: req.body.catalogueNumber || '',
      youTube: req.body.youTube || '',
    };

     if (req.body.genreInput && req.body.genreInput.trim() !== "") {
      updates.genre = req.body.genreInput.trim();
    }


    if (req.body.composerInput && req.body.composerInput.trim() !== "") {
      const input = req.body.composerInput.trim();
      let composer;

      if (/^\d+$/.test(input)) {
        // Numeric → treat as OpenOpus apiId
        const apiUrl = `https://api.openopus.org/composer/list/ids/${input}.json`;
        const data = await (await fetch(apiUrl)).json();
        const c = data.composers && data.composers[0];
        if (c) {
          composer = await Composer.findOneAndUpdate(
            { apiId: c.id.toString() },
            {
              apiId: c.id.toString(),
              name: c.name,
              completeName: c.complete_name,
              epoch: c.epoch,
              birthYear: c.birth ? new Date(c.birth).getFullYear() : null,
              deathYear: c.death ? new Date(c.death).getFullYear() : null,
              portrait: c.portrait || null,
            },
            { upsert: true, new: true }
          );
        }
      } else {
        //go back to opus if probblems
        const apiUrl = `https://api.openopus.org/omnisearch/${encodeURIComponent(input)}/0.json`;
        const data = await (await fetch(apiUrl)).json();
        const c = data.results && data.results.find(r => r.composer)?.composer;
        if (c) {
          composer = await Composer.findOneAndUpdate(
            { apiId: c.id.toString() },
            {
              apiId: c.id.toString(), //so we can search it
              name: c.name,
              completeName: c.complete_name,
              epoch: c.epoch,
              birthYear: c.birth ? new Date(c.birth).getFullYear() : null,
              deathYear: c.death ? new Date(c.death).getFullYear() : null,
              portrait: c.portrait || null,
            },
            { upsert: true, new: true }
          );
        }
      }

      if (composer) {
        updates.composer = composer._id;
      }
    }

    const work = await Work.findOneAndUpdate(
      { apiId: req.params.workId },
      updates,  //updates has the new values
      { new: true }
    ).populate("composer");

    if (!work) return res.status(404).send("Work not found");

    res.redirect(`/works/${work.apiId}`);
  } catch (err) {
    console.error("Error updating work:", err);
    res.status(500).send(err.message);
  }
});

module.exports = router;