// routes/media.js
var express = require("express");
module.exports = function (db, ObjectId) {
    var router = express.Router();

    // Search Media Route
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

    // Media Details Route
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

    return router;
};
