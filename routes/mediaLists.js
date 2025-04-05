// mediaLists.js
const express = require("express");
const router = express.Router();

module.exports = function (db) {
    const mediaListsCollection = db.collection("mediaLists");

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


    router.post("/update", async (req, res) => {
        const { uid, media_id, score, favourited } = req.body;
        if (!uid || !media_id) {
            return res.status(400).json({ error: "Missing uid or media_id" });
        }
        try {
            let userMediaList = await mediaListsCollection.findOne({ uid: uid });
            if (!userMediaList) {
                // Create a new document with this media entry.
                const newDoc = {
                    uid: uid,
                    media: [{ media_id: media_id, score: score || null, favourited: typeof favourited === "boolean" ? favourited : false }]
                };
                await mediaListsCollection.insertOne(newDoc);
                return res.json({ success: true, created: true });
            } else {
                // Check if the media entry exists.
                const existing = userMediaList.media.find(item => item.media_id === media_id);
                if (!existing) {
                    await mediaListsCollection.updateOne(
                        { uid: uid },
                        { $push: { media: { media_id: media_id, score: score || null, favourited: typeof favourited === "boolean" ? favourited : false } } }
                    );
                    return res.json({ success: true, created: true });
                } else {
                    // Update the existing media entry.
                    await mediaListsCollection.updateOne(
                        { uid: uid, "media.media_id": media_id },
                        { $set: { "media.$.score": score, "media.$.favourited": favourited } }
                    );
                    return res.json({ success: true, updated: true });
                }
            }
        } catch (error) {
            console.error("Error updating media entry:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};
