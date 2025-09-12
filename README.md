#CRUD Classical App--Welcome to the Composers and Classical Music Encyclopedia!

![Classical App Screenshot](./assets/classical_app.png)

[Live Demo](https://classical-encyclopedia-9d99a6ed6053.herokuapp.com/)

[GitHub Link](https://github.com/eslteacher902010/crud-app-composers)

## About the Project

This is a full-stack CRUD app where users can explore, search, and favorite classical **composers** and **works**. It integrates with the [OpenOpus API](https://openopus.org/) to fetch a wealth of composer/work data and adds persistence with MongoDB so users can build their own curated lists from the API.

---

## Technologies Used

* Node.js / Express
* MongoDB + Mongoose
* EJS templating
* CSS (custom styling)
* OpenOpus API integration
* Heroku for deployment

---

## ✨ Features

* View and search composers and their works.
* Add (to favorites--adding new composer **coming soon**), edit, and delete works (CRUD functionality).
* Favorite composers and works tied to logged-in users.
* API integration ensures up-to-date information.
* Clean UI with background images and styled result lists.

---

## How to Run Locally

1. Clone the repo:

   ```bash
   git clone https://github.com/yourusername/crud_classical_app.git
   cd crud_classical_app
   ```
2. Install dependencies:

   ```bash
   npm install
   ```
3. Create a `.env` file with:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_secret
   ```
4. Run the app:

   ```bash
   nodemon
   ```
5. Visit `http://localhost:3000` in your browser.

---

## CRUD Examples

### Create
```javascript
// show page but not for myfavs 
router.get('/:workId', async (req, res) => {
    const baseUrl = `https://api.openopus.org/work/detail/${req.params.workId}.json`;
    console.log(baseUrl)

  try { ///make a call to the api above
    const data= await (await fetch(baseUrl)).json()
    const work = data.work
    const composer=data.composer
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
'''


### Read

Browse all composers or search via OpenOpus API. Getting composer to show was kind of a pain especially in the Work stuff. This one was used for composers

```
javascript 

//this searches epoch 
router.get('/search/epoch', async (req, res) => {
  console.log(req.query.epoch)
  const baseUrl = `https://api.openopus.org/composer/list/epoch/${req.query.epoch}.json`

  try {
    const response = await fetch(baseUrl)
    const data = await response.json()

    const composers = data.composers.map(c => ({
      ...c,
      apiId: c.id,
      completeName: c.complete_name,
      birthYear: new Date (c.birth).getFullYear(),
      deathYear: new Date (c.death).getFullYear()
    }))

    res.render("composers/index", { composers, newComposer: null, epoch: req.query.search })

  } catch (err) {
    console.log(err)
    res.redirect('/')
  }
})
```

### Update

Edit work details (year composed, catalogue system, linked composer, YouTube link).

```js

///edit
router.get('/:composerId/edit', isSignedIn, async (req, res) => {
  try {
    const composer = await Composer.findOne({ apiId: req.params.composerId });
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
```
*Note: My Edit and Update in Works controller were a little more complicated as I gave the user ability to update composer name(since it was so often not adding) and genre(since that was not adding either very often). Below is Update.*

```Javascript

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

```


### Delete

*Unfavorite items from your list. I was pretty happy with this feature. I got somehelp from Stefanie. I won't share the buton but here is a little of the ejs.*

```html

<form method="POST" action="/composers/<%= composer.apiId %>/favorites">
   <% if (user && composer.favoritedBy.includes(user._id)) { %>
  <button class= "favorite-button" type="submit">Remove Composer from Favorites</button>
  <% } else{ %>
    <button  class= "favorite-button" type="submit">Add Composer to Favorites</button>
  <% } %>
</form>
```

## Example Code: Populate Favorites
*Populating was a huge part of this*
```js
const populatedWorks = await Work.find({ favoritedBy: req.session.user._id })
  .populate({
    path: "composer",
    model: "Composer",
    select: "apiId completeName name"
  })
  .sort({ yearComposed: -1 });
```

---

## Next Steps

* Add authentication with OAuth providers.
* Improve error handling when API results don’t return matches.
* Add filtering by **epoch** or **genre** for better discovery.
* Implement user profile pages with personal music libraries.
* Add the ability to create a new composer--Noticed there's no ***Fanny***. This will be coming soon.

---

## 🎵 Credits

* Data from [OpenOpus API](https://openopus.org/)
* Built with ❤️ for classical music enthusiasts.
* Thank you to Stephanie Lee.

