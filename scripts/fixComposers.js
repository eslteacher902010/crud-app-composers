const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Work = require("../models/work");
const Composer = require("../models/composer");

const MONGO_URI = "mongodb://127.0.0.1:27017/crud_music_app";

async function fixComposers() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // explicitly find works with composer = null
  const works = await Work.find({
  $or: [
    { composer: null },
    { composer: { $exists: false } }
  ]
});


  for (const work of works) {
    console.log(`Fixing ${work.title} (${work.apiId})`);

    const res = await fetch(`https://api.openopus.org/work/detail/${work.apiId}.json`);
    const data = await res.json();

    if (!data.composer) {
      console.log(`No composer info from API for ${work.title}`);
      continue;
    }

    const c = data.composer;

    const composerDoc = await Composer.findOneAndUpdate(
      { apiId: c.id },
      {
        $set: {
          apiId: c.id,
          name: c.name,
          completeName: c.complete_name,
          epoch: c.epoch,
          birthYear: c.birth ? new Date(c.birth).getFullYear() : null,
          deathYear: c.death ? new Date(c.death).getFullYear() : null,
          portrait: c.portrait || null,
        },
      },
      { new: true, upsert: true }
    );

    work.composer = composerDoc._id;
    await work.save();

    console.log(`Linked ${work.title} → ${composerDoc.completeName}`);
  }

  console.log("Fix finished!");
  await mongoose.disconnect();
}

fixComposers();
