// scripts/fixWorks.js
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Work = require("../models/work");
const Composer = require("../models/composer");

const MONGO_URI = "mongodb://127.0.0.1:27017/crud_music_app";

(async () => {
  await mongoose.connect(MONGO_URI);

  const works = await Work.find({}).populate("composer");
  for (const work of works) {
    if (!work.composer) {
      console.log("Fixing:", work.title, work.apiId);

      const res = await fetch(`https://api.openopus.org/work/detail/${work.apiId}.json`);
      const data = await res.json();
      const c = data.composer;

      if (c) {
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
          { new: true, upsert: true }
        );

        await Work.updateOne(
          { _id: work._id },
          { $set: { composer: composerDoc._id } }
        );
      }
    }
  }

  console.log("Done fixing works");
  await mongoose.disconnect();
})();
