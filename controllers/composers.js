const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const Composer = require("../models/composer");
const UserComposer = require('../models/userComposer');
const Work = require('../models/work');
const isSignedIn = require('../middleware/is-signed-in');


///experiment
// add new composer form
router.get('/new', isSignedIn, (req, res) => {
  res.render('composers/new.ejs'); 
});

// create composer with no API
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

//see those composers
router.get('/recent', async (req, res) => {
  try {
    const recentComposers = await Composer.find()
      .sort({ createdAt: -1 }).limit(5);

    const recentWorks = await Work.find()
      .sort({ createdAt: -1 }).limit(5);

    res.render('composers/recent.ejs', { composers: recentComposers, works: recentWorks });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error getting composer or work");
  }
});


//my fav composers
router.get('/favorites', isSignedIn, async (req, res) => {
  console.log("hello")
  const populatedComposers = await Composer.find({ favoritedBy: req.session.user._id });
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
  const baseUrl = `https://api.openopus.org/composer/list/search/${req.query.search}.json`
  try {
    const data = await (await fetch(baseUrl)).json();
    const composer = data.composers[0];
    composer.apiId = composer.id;
    composer.birthYear = new Date(composer.birth).getFullYear();
    composer.deathYear = new Date(composer.death).getFullYear();
    composer.completeName = composer.complete_name;

    const c = await Composer.findOne({ apiId: composer.id });
    if (!c) {
      const newComposer = await Composer.create(composer);
      res.render("composers/index.ejs", { newComposer, composers: null });
    } else {
      res.render("composers/index.ejs", { newComposer: c, composers: null });
    }
  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});


//this searches epoch 
router.get('/search/epoch', async (req, res) => {
  console.log(req.query.epoch);
  const baseUrl = `https://api.openopus.org/composer/list/epoch/${req.query.epoch}.json`;

  try {
    const response = await fetch(baseUrl);
    const data = await response.json();

    const composers = data.composers.map(c => ({
      ...c,
      apiId: c.id,
      completeName: c.complete_name,
      birthYear: new Date(c.birth).getFullYear(),
      deathYear: new Date(c.death).getFullYear()
    }));

    res.render("composers/index", { composers, newComposer: null, epoch: req.query.search });

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});

// search only local composers (manually added)
router.get('/search/local', async (req, res) => {
  try {
    const term = req.query.search || "";

    let composers;
    if (term.trim() === "") {
      // if no search term, return all local composers
      composers = await Composer.find({ source: "local" });
    } else {
      // regex search against name/completeName
      composers = await Composer.find({
        source: "local",
        $or: [
          { name: { $regex: term, $options: "i" } },
          { completeName: { $regex: term, $options: "i" } }
        ]
      });
    }

    res.render("composers/index.ejs", { 
      composers, 
      newComposer: null, 
      epoch: null 
    });
  } catch (err) {
    console.error("Error searching local composers:", err);
    res.redirect('/composers');
  }
});



///edit
router.get('/:composerId/edit', isSignedIn, async (req, res) => {
  try {
    const { composerId } = req.params;

    let composer;
    if (/^[0-9a-fA-F]{24}$/.test(composerId)) {
      // It's a MongoDB ObjectId--got letters and shit
      composer = await Composer.findById(composerId);
    } else {
      // It's an API id--cleaner
      composer = await Composer.findOne({ apiId: composerId });
    }

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

    // Handle when the ID is a MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(composerId)) {
      composer = await Composer.findById(composerId);
      if (!composer) return res.redirect('/');

      // Only fetch OpenOpus API works if this composer has an apiId
      let apiWorks = [];
      if (composer.apiId) {
        const worksRes = await fetch(
          `https://api.openopus.org/work/list/composer/${composer.apiId}/genre/Popular.json`
        );
        const worksData = await worksRes.json();

        // Tag all API works with a `source` so the view knows
        apiWorks = (worksData.works || []).map(w => ({ ...w, source: "api" }));
      }

      // Always grab local works saved in MongoDB
      const dbWorks = (await Work.find({ composer: composer._id }).sort({ createdAt: -1 }))
        // Convert Mongoose docs to plain objects and tag with `source: "local"`
        .map(w => ({ ...w.toObject(), source: "local" }));

      // Merge DB and API works
      works = [...dbWorks, ...apiWorks];

      return res.render("composers/show.ejs", { 
        composer, 
        epoch: composer.epoch, 
        works, 
        user: req.session.user 
      });

    } else {
      // Handle when the ID is an OpenOpus API id (all digits)
      const baseUrl = `https://api.openopus.org/composer/list/ids/${composerId}.json`;
      const data = await (await fetch(baseUrl)).json();
      if (!data.composers || !data.composers.length) return res.redirect('/');

      const apiComposer = data.composers[0];

      // Update or insert the local copy of the composer
      composer = await Composer.findOneAndUpdate(
        { apiId: apiComposer.id },
        {
          $set: {
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

      // Fetch OpenOpus works by API id
      const worksRes = await fetch(
        `https://api.openopus.org/work/list/composer/${composer.apiId}/genre/Popular.json`
      );
      const worksData = await worksRes.json();

      // Tag API works
      const apiWorks = (worksData.works || []).map(w => ({ ...w, source: "api" }));

      // Also fetch local works tied to this composer
      const dbWorks = (await Work.find({ composer: composer._id }).sort({ createdAt: -1 }))
        // Tag DB works
        .map(w => ({ ...w.toObject(), source: "local" }));

      // Merge DB and API works
      works = [...dbWorks, ...apiWorks];

      return res.render("composers/show.ejs", { 
        composer, 
        epoch: composer.epoch, 
        works, 
        user: req.session.user 
      });
    }

  } catch (err) {
    console.log(err);
    res.redirect('/');
  }
});






//create the fav list
router.post('/:composerId/favorites', isSignedIn, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { composerId } = req.params;

    let composer;

    // First try by Mongo ObjectId or apiId
    if (/^[0-9a-fA-F]{24}$/.test(composerId)) {
      composer = await Composer.findById(composerId);
    } else {
      composer = await Composer.findOne({ apiId: composerId });
    }

    // If not found locally → fetch from OpenOpus and insert
    if (!composer) {
      const baseUrl = `https://api.openopus.org/composer/list/ids/${composerId}.json`;
      const data = await (await fetch(baseUrl)).json();

      if (!data.composers || !data.composers.length) {
        return res.status(404).send("Composer not found");
      }

      const apiComposer = data.composers[0];
      composer = await Composer.create({
        apiId: apiComposer.id.toString(),
        name: apiComposer.name,
        completeName: apiComposer.complete_name,
        epoch: apiComposer.epoch || null,
        birthYear: apiComposer.birth ? new Date(apiComposer.birth).getFullYear() : null,
        deathYear: apiComposer.death ? new Date(apiComposer.death).getFullYear() : null,
        portrait: apiComposer.portrait || null,
        source: "api",
        favoritedBy: []
      });
    }

    // Ensure favoritedBy exists
    if (!Array.isArray(composer.favoritedBy)) {
      composer.favoritedBy = [];
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Toggle favorite
    if (!composer.favoritedBy.some(id => id.equals(userObjectId))) {
      composer.favoritedBy.push(userObjectId);
    } else {
      composer.favoritedBy = composer.favoritedBy.filter(id => !id.equals(userObjectId));
    }

    await composer.save();

    // ✅ Safe redirect based on source
    let redirectId;
    if (composer.source === "local" || !composer.apiId) {
      redirectId = composer._id;
    } else {
      redirectId = composer.apiId;
    }

    console.log("Redirecting to:", redirectId);
    res.redirect(`/composers/${redirectId}`);

  } catch (err) {
    console.error("Error toggling favorite:", err);
    res.status(500).send("Error updating favorites");
  }
});


///updating
// === Update Composer (handles both _id and apiId) ===
router.put('/:composerId', async (req, res) => {
  try {
    const { composerId } = req.params;

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

    let composer;
    if (/^[0-9a-fA-F]{24}$/.test(composerId)) {
      // Local Mongo ObjectId
      composer = await Composer.findOneAndUpdate(
        { _id: composerId },
        updates,
        { new: true }
      );
    } else {
      // API composer id
      composer = await Composer.findOneAndUpdate(
        { apiId: composerId },
        updates,
        { new: true }
      );
    }

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

    res.redirect(`/composers/${composer.apiId || composer._id}`);
  } catch (err) {
    console.error("Error updating composer:", err);
    res.status(500).send(err.message);
  }
});



// // Delete a work
// router.delete('/works/:workId', isSignedIn, async (req, res) => {
//   try {
//     // Handle either Mongo _id or apiId
//     const work = await Work.findOneAndDelete({
//       $or: [{ _id: req.params.workId }, { apiId: req.params.workId }]
//     });

//     if (!work) return res.status(404).send("Work not found");

//     res.redirect(`/composers/${work.composer}`);
//   } catch (err) {
//     console.error("Error deleting work:", err);
//     res.status(500).send("Error deleting work");
//   }
// });



//individual's list
module.exports = router;
