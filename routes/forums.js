// routes/forums.js
const express = require("express");

module.exports = function (db) {
    const router = express.Router();

    // Create a new forum (only accessible to administrators)
    router.post("/create", async (req, res) => {
        const { name, description, role, category } = req.body;

        // Basic validation: ensure name and description are provided
        if (!name || !description) {
            return res.status(400).json({ error: "Name and description are required" });
        }

        // Administrators validation
        if (role !== "administrator") {
            return res.status(403).json({ error: "You do not have permission to create a forum" });
        }

        // Use provided category, or default to "General"
        const forumCategory = category && category.trim() ? category.trim() : "General";

        try {
            const forumsCollection = db.collection("forums");

            // Add a new forum_id based on the last forum_id in the collection.
            const lastForum = await forumsCollection.findOne({}, { sort: { forum_id: -1 } });
            const newForumId = lastForum && lastForum.forum_id ? lastForum.forum_id + 1 : 1;

            // Prepare the forum document including the new forum_id.
            const forumDoc = {
                forum_id: newForumId,
                name: name,
                description: description,
                category: forumCategory,
                topics_count: 0,
                posts_count: 0,
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await forumsCollection.insertOne(forumDoc);
            return res.json({ success: true, forum: result.ops ? result.ops[0] : forumDoc });
        } catch (error) {
            console.error("Error creating forum:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    // Return all forums
    router.get("/", async (req, res) => {
        try {
            const forumsCollection = db.collection("forums");
            const forums = await forumsCollection.find({}).toArray();
            return res.json(forums);
        } catch (error) {
            console.error("Error fetching forums:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};
