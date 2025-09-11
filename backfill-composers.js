// backfill-composers.js
const mongoose = require("mongoose");
const fetch = require("node-fetch");

const Work = require("./models/work");
const Composer = require("./models/composer");

const MONGO_URI = "mongodb://127.0.0.1:27017/crud_music_app";

async function backfillComposers() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const works = await Work.find({});
  console.log(`Found ${works.length} works`);

  for (const work of works) {
    console.log("Fixing work:", work.title, work.apiId);

    const res = await fetch(`https://api.openopus.org/work/detail/${work.apiId}.json`);
    const data = await res.json();

    if (!data.composer) continue;
    const c = data.composer;

    // upsert the composer using Mongoose
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
          portrait: c.portrait || null
        }
      },
      { upsert: true, new: true }
    );

    // relink the work to the correct ObjectId
    await Work.updateOne(
      { _id: work._id },
      { $set: { composer: composerDoc._id } }
    );

    console.log("Linked:", work.title, "→", c.complete_name);
  }

  console.log("Backfill finished!");
  await mongoose.disconnect();
}

backfillComposers();
