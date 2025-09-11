const mongoose = require("mongoose");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


const Work = require("./models/work");
const Composer = require("./models/composer");

const MONGO_URI = "mongodb://127.0.0.1:27017/crud_music_app";

async function seedFavorites() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const favoriteIds = ["5044", "26562", "17276"]; // your favorite works’ API IDs

  for (const id of favoriteIds) {
    console.log("Fetching work", id);
    const res = await fetch(`https://api.openopus.org/work/detail/${id}.json`);
    const data = await res.json();

    if (!data.work || !data.composer) continue;

    const work = data.work;
    const composer = data.composer;

    // ensure composer exists
    const composerDoc = await Composer.findOneAndUpdate(
      { apiId: composer.id },
      {
        $set: {
          apiId: composer.id,
          name: composer.name,
          completeName: composer.complete_name,
          epoch: composer.epoch,
          birthYear: composer.birth ? new Date(composer.birth).getFullYear() : null,
          deathYear: composer.death ? new Date(composer.death).getFullYear() : null,
          portrait: composer.portrait || null
        }
      },
      { new: true, upsert: true }
    );

    // ensure work exists and is linked to composer
    await Work.findOneAndUpdate(
      { apiId: work.id },
      {
        $set: {
          apiId: work.id,
          title: work.title,
          subtitle: work.subtitle || "",
          genre: work.genre || "",
          composer: composerDoc._id
        }
      },
      { new: true, upsert: true }
    );

    console.log(`Linked: ${work.title} → ${composer.complete_name}`);
  }

  await mongoose.disconnect();
  console.log("Seeding finished!");
}

seedFavorites();
