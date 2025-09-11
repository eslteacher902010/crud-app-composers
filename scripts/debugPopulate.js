const mongoose = require("mongoose");
const Work = require("../models/work");
const Composer = require("../models/composer");

const MONGO_URI = "mongodb://127.0.0.1:27017/crud_music_app";

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const work = await Work.findOne({ title: "Boléro" })
    .populate({ path: "composer", model: "Composer" });

  console.log(JSON.stringify(work, null, 2));

  await mongoose.disconnect();
})();
