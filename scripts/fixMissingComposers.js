// scripts/fixMissingComposers.js
const mongoose = require("mongoose");
const Work = require("../models/work");
const Composer = require("../models/composer");

const MONGO_URI = "mongodb://127.0.0.1:27017/crud_music_app";

const fixes = [
  { apiId: "5044", title: "Boléro", composerName: "Maurice Ravel" },
  { apiId: "17119", title: 'Polonaise no. 6 in A flat major, op. 53, "Heroic"', composerName: "Frédéric Chopin" },
  { apiId: "17276", title: "Preludes, op. 28", composerName: "Frédéric Chopin" },
  { apiId: "26562", title: "Missa Papae Marcelli ", composerName: "Giovanni Pierluigi da Palestrina" },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  for (const { apiId, title, composerName } of fixes) {
    let work = await Work.findOne({ apiId });
    if (!work) {
      work = await Work.findOne({ title: new RegExp(title, "i") });
      if (work) {
        console.log(`⚠️ Found ${title} only by title (not apiId: ${apiId})`);
      }
    }

    const composer = await Composer.findOne({ completeName: composerName });

    if (!work) {
      console.log(`❌ Work not found: ${title} (apiId: ${apiId})`);
      continue;
    }
    if (!composer) {
      console.log(`❌ Composer not found: ${composerName}`);
      continue;
    }

    work.composer = composer._id;
    await work.save();
    console.log(`✅ Linked ${title} → ${composerName}`);
  }

  await mongoose.disconnect();
  console.log("Done!");
}

run();
