// routes/posts.js
const express = require('express');

module.exports = function (db, dbFirestore) {
    const router = express.Router();

    // Create a new post (reply) under a topic and increment posts count.
    router.post('/create', async (req, res) => {
        const { topic_id, author_uid, content } = req.body;
        if (!topic_id || !author_uid || !content) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        try {
            const postsCollection = db.collection('posts');
            const topicsCollection = db.collection('topics');
            const forumsCollection = db.collection('forums');

            // Add a new unique post_id based on the last post_id in the collection.
            const lastPost = await postsCollection.findOne({}, { sort: { post_id: -1 } });
            const newPostId = lastPost && lastPost.post_id ? lastPost.post_id + 1 : 1;

            const postDoc = {
                post_id: newPostId,
                topic_id,
                author_uid,
                content,
                created_at: new Date(),
                edited_at: null
            };

            // Insert the new post
            await postsCollection.insertOne(postDoc);

            // Find the topic associated with the post
            const topic = await topicsCollection.findOne({ topic_id: topic_id });

            // Increment the posts count and update the updated_at field in the corresponding topic
            await topicsCollection.updateOne(
                { topic_id: topic_id },
                {
                    $inc: { posts_count: 1 },
                    $set: { updated_at: new Date() }
                }
            );

            // Increment the posts count in the corresponding forum
            if (topic) {
                await forumsCollection.updateOne(
                    { forum_id: topic.forum_id },
                    { $inc: { posts_count: 1 } }
                );
            }

            return res.json({ success: true, post: postDoc });
        } catch (error) {
            console.error('Error creating post:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });




    // Return all posts for a topic by topic_id.
    router.get('/:topic_id', async (req, res) => {
        const topicId = Number(req.params.topic_id);
        if (!topicId) {
            return res.status(400).json({ error: 'Topic ID is required and must be a number.' });
        }

        try {
            const postsCollection = db.collection('posts');
            const topicsCollection = db.collection('topics');

            // Increment the views count for the topic
            await topicsCollection.updateOne(
                { topic_id: topicId },
                { $inc: { views: 1 } }
            );

            // Fetch posts for the topic
            const posts = await postsCollection.find({ topic_id: topicId }).sort({ created_at: 1 }).toArray();

            // Enrich posts with author display names from Firestore
            const enrichedPosts = await Promise.all(
                posts.map(async post => {
                    try {
                        const userDoc = await dbFirestore.collection("users").doc(post.author_uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const displayName = userData.username || post.author_uid;
                            return { ...post, author_displayName: displayName };
                        } else {
                            return { ...post, author_displayName: post.author_uid };
                        }
                    } catch (e) {
                        console.error("Error fetching user for uid:", post.author_uid, e);
                        return { ...post, author_displayName: post.author_uid };
                    }
                })
            );

            return res.json(enrichedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });


    return router;
};
