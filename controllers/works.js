const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Work = require("../models/work");
const Composer = require("../models/composer");
const UserWork = require("../models/userWork");
const isSignedIn = require("../middleware/is-signed-in");


// === Index: list all works ===
// === Index: list all works ===
router.get("/", async (req, res) => {
  try {
    const works = await Work.find().populate("composer").sort({ yearComposed: -1 });
    res.render("works/index.ejs", { 
      works, 
      search: null, 
      offset: 0, 
      newWork: null, 
      mode: "index" 
    });
  } catch (err) {
    console.error("Error loading works:", err);
    res.status(500).send("Error loading works");
  }
});



// === Add New Work Form ===
router.get("/new", isSignedIn, async (req, res) => {
  const composers = await Composer.find();
  res.render("works/new", { 
    composers,
    bodyClass: "treble"  // wallpaper background
  });
});

// === Create Work ===
router.post("/", isSignedIn, async (req, res) => {
  try {
    let composerDoc = null;

    if (req.body.composerId) {
      composerDoc =
        (await Composer.findById(req.body.composerId)) ||
        (await Composer.findOne({ apiId: req.body.composerId }));
    }

    const work = await Work.create({
      title: req.body.title,
      subtitle: req.body.subtitle || "",
      yearComposed: req.body.yearComposed || null,
      catalogueSystem: req.body.catalogueSystem || "",
      catalogueNumber: req.body.catalogueNumber || "",
      genre: req.body.genre || "",
      youTube: req.body.youTube || "",
      composer: composerDoc ? composerDoc._id : null,
      source: "local",
    });

    work.apiId = work._id.toString();
    await work.save();

    res.redirect(`/works/${work.apiId}`);
  } catch (err) {
    console.error("Error creating work:", err);
    res.redirect("/works");
  }
});

// === Favorites ===
router.get("/favorites", isSignedIn, async (req, res) => {
  try {
    const populatedWorks = await Work.find({ favoritedBy: req.session.user._id })
      .populate({
        path: "composer",
        model: "Composer",
        select: "apiId completeName name",
      })
      .sort({ yearComposed: -1 });

    res.render("works/myFavWorks.ejs", { works: populatedWorks });
  } catch (err) {
    console.error("Error loading favorites:", err);
    res.redirect("/works");
  }
});

// === Search ===
router.get("/search", async (req, res) => {
  const query = req.query.search;
  const offset = req.query.offset || 0;
  const url = `https://api.openopus.org/omnisearch/${query}/${offset}.json`;

  try {
    const data = await (await fetch(url)).json();
    const results = data.results || [];

    const works = results
      .filter((r) => r.work)
      .map((r) => ({
        ...r.work,
        composer: r.composer,
      }));

    res.render("works/index.ejs", {
      works,
      newWorks: null,
      genre: null,
      offset,
      search: req.query.search,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// === Search by Genre ===
router.get("/search/genre", async (req, res) => {
  const { composerId, genre } = req.query;
  const url = `https://api.openopus.org/work/list/composer/${composerId}/genre/${genre}.json`;

  try {
    const data = await (await fetch(url)).json();
    const works = data.works || [];

    res.render("works/index.ejs", { works, genre, offset: 0, search: null });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// === Edit Work ===
router.get("/:workId/edit", isSignedIn, async (req, res) => {
  try {
    const { workId } = req.params;
    let work;

    if (/^[0-9a-fA-F]{24}$/.test(workId)) {
      // MongoDB ObjectId
      work = await Work.findById(workId);
    } else {
      // API id
      work = await Work.findOne({ apiId: workId });
    }

    if (!work) return res.status(404).send("Work not found");

    let userWork = await UserWork.findOne({
      user: req.session.user._id,
      work: work._id,
    });

    if (!userWork) {
      userWork = await UserWork.create({
        user: req.session.user._id,
        work: work._id,
        notes: "",
        youTube: "",
      });
    }

    res.render("works/edit.ejs", { 
      work, 
      userWork,
      title: `Edit ${work.title || work.subtitle} | Classical DB`,
      bodyClass: "treble"   // wallpaper background 
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// === Show Work (local or API, skip "test") ===
router.get("/:workId", async (req, res) => {
  const { workId } = req.params;
  const baseUrl = `https://api.openopus.org/work/detail/${workId}.json`;

  try {
    // Case 1: Local Mongo ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(workId)) {
      const work = await Work.findOne({
        _id: workId,
        title: { $ne: "test" },
      }).populate("composer");

      if (!work) return res.status(404).send("Local work not found");

      return res.render("works/show.ejs", {
        work,
        genre: work.genre,
        user: req.session.user,
      });
    }

    // Case 2: Local Work by apiId
    const work = await Work.findOne({
      apiId: workId,
      title: { $ne: "test" },
    }).populate("composer");

    if (work) {
      return res.render("works/show.ejs", {
        work,
        genre: work.genre,
        user: req.session.user,
      });
    }

    // Case 3: Fallback → OpenOpus API
    const data = await (await fetch(baseUrl)).json();
    if (!data || !data.work || !data.composer) {
      return res.redirect("/works");
    }

    const apiWork = data.work;
    const apiComposer = data.composer;

    let composerDoc = await Composer.findOne({ apiId: apiComposer.id });
    if (!composerDoc) {
      composerDoc = await Composer.create({
        apiId: apiComposer.id,
        name: apiComposer.name,
        completeName: apiComposer.complete_name,
        epoch: apiComposer.epoch,
        birthYear: apiComposer.birth
          ? new Date(apiComposer.birth).getFullYear()
          : null,
        deathYear: apiComposer.death
          ? new Date(apiComposer.death).getFullYear()
          : null,
        portrait: apiComposer.portrait || null,
      });
    }

    let localWork = await Work.findOne({ apiId: apiWork.id });
    if (!localWork) {
      apiWork.apiId = apiWork.id;
      apiWork.composer = composerDoc._id;
      localWork = await Work.create(apiWork);
    }

    const populated = await Work.findById(localWork._id).populate("composer");

    res.render("works/show.ejs", {
      work: populated,
      genre: populated.genre,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Error showing work:", err);
    res.redirect("/");
  }
});

// === Toggle Favorites ===
router.post("/:workId/favorites", isSignedIn, async (req, res) => {
  const work = await Work.findOne({ apiId: req.params.workId });
  if (!work) return res.redirect("/works");

  const userId = new mongoose.Types.ObjectId(req.session.user._id);

  if (!work.favoritedBy.some((id) => id.equals(userId))) {
    work.favoritedBy.push(userId);
  } else {
    work.favoritedBy = work.favoritedBy.filter((id) => !id.equals(userId));
  }

  await work.save();
  res.redirect(`/works/${req.params.workId}`);
});

// === Update Work ===
router.put("/:workId", async (req, res) => {
  try {
    const { workId } = req.params;
    let existingWork;

    // Case 1: Local ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(workId)) {
      existingWork = await Work.findById(workId);
    } else {
      // Case 2: API id
      existingWork = await Work.findOne({ apiId: workId });
    }

    if (!existingWork) return res.status(404).send("Work not found");

    const updates = {
      subtitle: req.body.subtitle || "",
      genre: req.body.genre || "",
      yearComposed: req.body.yearComposed || null,
      catalogueSystem: req.body.catalogueSystem || "",
      catalogueNumber: req.body.catalogueNumber || "",
      youTube: req.body.youTube || "",
    };

    if (existingWork.source?.toLowerCase() === "local") {
      updates.title = req.body.title;
    }

    let updatedWork;

    if (/^[0-9a-fA-F]{24}$/.test(workId)) {
      // Update local work by _id
      updatedWork = await Work.findOneAndUpdate(
        { _id: existingWork._id },
        updates,
        { new: true }
      ).populate("composer");
    } else {
      // Update API work by apiId
      updatedWork = await Work.findOneAndUpdate(
        { apiId: workId },
        updates,
        { new: true }
      ).populate("composer");
    }

    res.redirect(`/works/${updatedWork.apiId || updatedWork._id}`);
  } catch (err) {
    console.error("Error updating work:", err);
    res.status(500).send(err.message);
  }
});


// === Delete Work ===
router.delete("/:workId", isSignedIn, async (req, res) => {
  try {
    const work =
      (await Work.findByIdAndDelete(req.params.workId)) ||
      (await Work.findOneAndDelete({ apiId: req.params.workId }));

    if (!work) return res.status(404).send("Work not found");

    res.redirect(`/composers/${work.composer}`);
  } catch (err) {
    console.error("Error deleting work:", err);
    res.status(500).send("Error deleting work");
  }
});

module.exports = router;
