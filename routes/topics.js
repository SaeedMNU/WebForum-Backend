// routes/topics.js
const express = require('express');

module.exports = function (db, dbFirestore) {
    const router = express.Router();

    // Create a new topic in the specified forum.
    router.post('/create', async (req, res) => {
        const { forum_id, title, author_uid, content } = req.body;
        if (!forum_id || !title || !author_uid || !content) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        try {
            const topicsCollection = db.collection('topics');
            const forumsCollection = db.collection('forums');

            // Add a new unique topic_id based on the last topic_id in the collection.
            const lastTopic = await topicsCollection.findOne({}, { sort: { topic_id: -1 } });
            const newTopicId = lastTopic && lastTopic.topic_id ? lastTopic.topic_id + 1 : 1;

            const topicDoc = {
                topic_id: newTopicId,
                forum_id,
                title,
                author_uid,
                content,
                posts_count: 0,
                views: 0,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Insert the new topic
            await topicsCollection.insertOne(topicDoc);

            // Increment the topics count in the corresponding forum
            await forumsCollection.updateOne(
                { forum_id: forum_id },
                { $inc: { topics_count: 1 } }
            );

            return res.json({ success: true, topic: topicDoc });
        } catch (error) {
            console.error('Error creating topic:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });

    // Return all topics for a forum by forum_id.
    router.get('/:forum_id', async (req, res) => {
        const forumId = Number(req.params.forum_id);
        if (!forumId) {
            return res.status(400).json({ error: 'Forum ID is required and must be a number.' });
        }
        try {
            const topicsCollection = db.collection('topics');
            const topics = await topicsCollection.find({ forum_id: forumId }).sort({ created_at: -1 }).toArray();

            // For each topic, fetch the user's display name from Firestore.
            const enrichedTopics = await Promise.all(
                topics.map(async topic => {
                    try {
                        const userDoc = await dbFirestore.collection("users").doc(topic.author_uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            // Use the "username" field" if it exists, otherwise fallback to the author_uid.
                            const displayName = userData.username || topic.author_uid;
                            return { ...topic, author_displayName: displayName };
                        } else {
                            console.log("No user document for UID", topic.author_uid);
                            return { ...topic, author_displayName: topic.author_uid };
                        }
                    } catch (e) {
                        console.error("Error fetching user for uid:", topic.author_uid, e);
                        return { ...topic, author_displayName: topic.author_uid };
                    }
                })
            );


            return res.json(enrichedTopics);
        } catch (error) {
            console.error('Error fetching enriched topics:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });

    return router;
};
