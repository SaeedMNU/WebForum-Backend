// routes/media.js
var express = require("express");
module.exports = function (db, ObjectId) {
    var router = express.Router();

    // Search Media Route (e.g., GET /api/media/search/someterm)
    router.get("/search/:searchTerm", async function (req, res) {
        try {
            const searchTerm = req.params.searchTerm;
            const mediaItems = await db.collection("mediaTitles").aggregate([
                {
                    $match: {
                        $or: [
                            { title: { $regex: searchTerm, $options: "i" } },
                            { title_english: { $regex: searchTerm, $options: "i" } },
                            { title_japanese: { $regex: searchTerm, $options: "i" } },
                            { title_synonyms: { $regex: searchTerm, $options: "i" } }
                        ]
                    }
                },
                {
                    $project: {
                        _id: 1,
                        main_picture: 1,
                        title: 1,
                        type: 1,
                        premiered_season: 1,
                        aired_from: 1,
                        published_from: 1,
                        synopsis: 1
                    }
                }
            ]).toArray();

            if (mediaItems.length > 0) {
                res.json(mediaItems);
            } else {
                res.status(404).send("No media items found for the specified search.");
            }
        } catch (err) {
            console.error("Error fetching media items:", err);
            res.status(500).send("Error retrieving media items from the database.");
        }
    });

    // Media Details Route (e.g., GET /api/media/details/id)
    router.get("/details/:id", async function (req, res) {
        try {
            const objectId = req.params.id;
            if (!ObjectId.isValid(objectId)) {
                return res.status(400).send("Invalid ObjectId format.");
            }
            const mediaItem = await db.collection("mediaTitles").findOne({ _id: new ObjectId(objectId) });
            if (mediaItem) {
                res.json(mediaItem);
            } else {
                res.status(404).send("No media item found with the specified ID.");
            }
        } catch (err) {
            console.error("Error fetching media details:", err);
            res.status(500).send("Error retrieving media details from the database.");
        }
    });

    // New Home Route – fetch media titles for home page categories
    router.get("/home", async (req, res) => {
        try {
            const discovery = await db.collection("mediaTitles").aggregate([
                { $sample: { size: 10 } },
                { $project: { _id: 1, title: 1, main_picture: 1, synopsis: 1 } }
            ]).toArray();

            const genres = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Music", "Mystery", "Romance", "Sci-Fi", "Slice of Life"];
            const randomGenre = genres[Math.floor(Math.random() * genres.length)];
            const interestedIn = await db.collection("mediaTitles").aggregate([
                { $match: { genres: randomGenre } },
                { $sample: { size: 10 } },
                { $project: { _id: 1, title: 1, main_picture: 1, synopsis: 1 } }
            ]).toArray();

            const studios = ["Sunrise", "Toei Animation", "Gainax", "Studio Ghibli", "OLM", "Tatsunoko Production", "Ufotable", "TMS Entertainment", "Kyoto Animation", "Madhouse", "Production I.G", "Studio Deen", "MAPPA", "Bones", "Group TAC", "Xebec", "Wit Studio", "A-1 Pictures", "Trigger", "P.A. Works", "SILVER LINK.", "CloverWorks", "Kinema Citrus", "Lerche", "Doga Kobo", "Shaft", "A-1 Pictures", "White Fox", "Studio MAPPA"];
            const randomStudio = studios[Math.floor(Math.random() * studios.length)];
            const fanOf = await db.collection("mediaTitles").aggregate([
                { $match: { studios: randomStudio } },
                { $sample: { size: 10 } },
                { $project: { _id: 1, title: 1, main_picture: 1, synopsis: 1 } }
            ]).toArray();

            const licensors = ["Funimation", "Crunchyroll", "Sentai Filmworks", "Aniplex of America", "Discotek Media", "Netflix", "AnimEigo", "Nozomi Entertainment", "Media Blasters", "ADV Films", "Bandai Entertainment", "Manga Entertainment", "Kadokawa Pictures USA"];
            const randomLicensor = licensors[Math.floor(Math.random() * licensors.length)];
            const moreFrom = await db.collection("mediaTitles").aggregate([
                { $match: { licensors: randomLicensor } },
                { $sample: { size: 10 } },
                { $project: { _id: 1, title: 1, main_picture: 1, synopsis: 1 } }
            ]).toArray();

            const randomYear = Math.floor(Math.random() * (2023 - 1961 + 1)) + 1961;
            const rewindBackTo = await db.collection("mediaTitles").aggregate([
                { $match: { premiered_year: randomYear } },
                { $sample: { size: 10 } },
                { $project: { _id: 1, title: 1, main_picture: 1, synopsis: 1 } }
            ]).toArray();

            res.json({
                discovery,
                interested: { genre: randomGenre, items: interestedIn },
                fanOf: { studio: randomStudio, items: fanOf },
                moreFrom: { licensor: randomLicensor, items: moreFrom },
                rewindBackTo: { year: randomYear, items: rewindBackTo }
            });
        } catch (err) {
            console.error("Error loading home media:", err);
            res.status(500).send("Error retrieving home media items");
        }
    });

    return router;
};
