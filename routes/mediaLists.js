// mediaLists.js
const express = require("express");
const router = express.Router();

module.exports = function (db) {
    const mediaListsCollection = db.collection("mediaLists");
    const mediaTitlesCollection = db.collection("mediaTitles");

    // Toggle Endpoint: Adds or removes a media entry for the user.
    router.post("/toggle", async (req, res) => {
        const { uid, media_id } = req.body;
        if (!uid || !media_id) {
            return res.status(400).json({ error: "Missing uid or media_id" });
        }
        try {
            let userMediaList = await mediaListsCollection.findOne({ uid: uid });
            let added = false;
            if (!userMediaList) {
                // Create a new document for the user with a single media entry.
                const newDoc = {
                    uid: uid,
                    media: [{ media_id: media_id, score: null, favourited: false }]
                };
                await mediaListsCollection.insertOne(newDoc);
                added = true;
            } else {
                // Check if the media entry exists.
                const exists = userMediaList.media.some(item => item.media_id === media_id);
                if (exists) {
                    // Remove the media from the user's list.
                    await mediaListsCollection.updateOne(
                        { uid: uid },
                        { $pull: { media: { media_id: media_id } } }
                    );
                } else {
                    // Add the media entry to the user's list.
                    await mediaListsCollection.updateOne(
                        { uid: uid },
                        { $push: { media: { media_id: media_id, score: null, favourited: false } } }
                    );
                    added = true;
                }
            }
            return res.json({ added });
        } catch (error) {
            console.error("Error toggling media list:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    router.get("/entry", async (req, res) => {
        const { uid, media_id } = req.query;
        if (!uid || !media_id) {
            return res.status(400).json({ error: "Missing uid or media_id" });
        }
        try {
            let userMediaList = await mediaListsCollection.findOne({ uid: uid });
            if (!userMediaList) {
                return res.json({ exists: false });
            }
            // Convert both media_id values to string for a reliable comparison.
            const entry = userMediaList.media.find(item =>
                item.media_id.toString() === media_id.toString()
            );
            if (entry) {
                res.json({ exists: true, entry: entry });
            } else {
                res.json({ exists: false });
            }
        } catch (error) {
            console.error("Error fetching media entry:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });


    // Helper function performing aggregation
    async function updateMediaTitleAggregates(media_id) {
        const pipeline = [
            { $unwind: "$media" },
            { $match: { "media.media_id": media_id } },
            {
                $group: {
                    _id: "$media.media_id",
                    members: { $sum: 1 },
                    scored_by: {
                        $sum: {
                            $cond: [{ $ne: ["$media.score", null] }, 1, 0]
                        }
                    },
                    totalScore: {
                        $sum: {
                            $cond: [{ $ne: ["$media.score", null] }, "$media.score", 0]
                        }
                    },
                    favourites: {
                        $sum: {
                            $cond: [{ $eq: ["$media.favourited", true] }, 1, 0]
                        }
                    }
                }
            }
        ];

        const aggResult = await mediaListsCollection.aggregate(pipeline).toArray();
        if (aggResult.length > 0) {
            const data = aggResult[0];
            const avgScore = data.scored_by > 0 ? data.totalScore / data.scored_by : 0;
            await mediaTitlesCollection.updateOne(
                { media_id: media_id },
                {
                    $set: {
                        score: avgScore,
                        scored_by: data.scored_by,
                        members: data.members,
                        favourites: data.favourites
                    }
                },
                { upsert: true }
            );
        } else {
            // No entry exists, reset aggregated stats to zero.
            await mediaTitlesCollection.updateOne(
                { media_id: media_id },
                { $set: { score: 0, scored_by: 0, members: 0, favourites: 0 } },
                { upsert: true }
            );
        }
    }

    // Update individual media entry and then update aggregated stats.
    router.post("/update", async (req, res) => {
        const { uid, media_id, score, favourited } = req.body;
        if (!uid || !media_id) {
            return res.status(400).json({ error: "Missing uid or media_id" });
        }

        // Process the score - if it's an empty string or undefined, set it to null.
        const newScore = (score === "" || score === undefined) ? null : score;

        try {
            let userMediaList = await mediaListsCollection.findOne({ uid: uid });
            if (!userMediaList) {
                // No document exists for this user so create one with this new media entry.
                const newDoc = {
                    uid: uid,
                    media: [{
                        media_id: media_id,
                        score: newScore,
                        favourited: typeof favourited === "boolean" ? favourited : false
                    }]
                };
                await mediaListsCollection.insertOne(newDoc);
                // After adding, update aggregated values.
                await updateMediaTitleAggregates(media_id);
                return res.json({ success: true, created: true });
            } else {
                // Check if the media entry exists for the user.
                const existing = userMediaList.media.find(item => item.media_id.toString() === media_id.toString());
                if (!existing) {
                    // If it does not exist, push a new entry with the provided data.
                    await mediaListsCollection.updateOne(
                        { uid: uid },
                        {
                            $push: {
                                media: {
                                    media_id: media_id,
                                    score: newScore,
                                    favourited: typeof favourited === "boolean" ? favourited : false
                                }
                            }
                        }
                    );
                    await updateMediaTitleAggregates(media_id);
                    return res.json({ success: true, created: true });
                } else {
                    // Update the existing media entry
                    await mediaListsCollection.updateOne(
                        { uid: uid, "media.media_id": media_id },
                        { $set: { "media.$.score": newScore, "media.$.favourited": favourited } }
                    );
                    await updateMediaTitleAggregates(media_id);
                    return res.json({ success: true, updated: true });
                }
            }
        } catch (error) {
            console.error("Error updating media entry:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    router.get("/user-list", async (req, res) => {
        const { uid } = req.query;

        if (!uid) {
            return res.status(400).json({ error: "Missing uid" });
        }

        try {
            const userMediaList = await mediaListsCollection.findOne({ uid: uid });

            if (!userMediaList || !userMediaList.media.length) {
                return res.json({ mediaList: [] });
            }

            const mediaIds = userMediaList.media.map(item => item.media_id);

            // Get full media title data for all media_ids in one query
            const titles = await mediaTitlesCollection
                .find({ media_id: { $in: mediaIds } })
                .toArray();

            // Merge score/favourited with main_picture/title
            const fullList = userMediaList.media.map(item => {
                const titleData = titles.find(t => t.media_id === item.media_id);
                return {
                    media_id: item.media_id,
                    score: item.score,
                    favourited: item.favourited,
                    title: titleData?.title || "Unknown",
                    main_picture: titleData?.main_picture || ""
                };
            });

            return res.json({ mediaList: fullList });

        } catch (error) {
            console.error("Error loading user list:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });



    return router;
};
