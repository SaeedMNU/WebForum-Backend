// routes/auth.js
var express = require("express");
module.exports = function (auth, dbFirestore, admin, fetch, firebaseApiKey) {
    var router = express.Router();

    // Register Route
    router.post("/register", async (req, res) => {
        try {
            const { email, password, username } = req.body;

            // Create a new user with displayName set to username
            const userRecord = await auth.createUser({
                email: email,
                password: password,
                displayName: username
            });

            // Save user profile to Firestore
            await dbFirestore.collection("users").doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: email,
                username: username,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                profile_picture: "",
                bio: "",
                forum_posts_count: 0,
                social_posts_count: 0,
                liked_forum_posts: [],
                disliked_forum_posts: [],
                liked_social_posts: [],
                disliked_social_posts: [],
                likes_received: 0,
                dislikes_received: 0,
                completed_media_ids: [],
                website_role: "user",  // Default role
                theme: "",
                notification_settings: {
                    forum_notifications: true,
                    social_notifications: true
                }
            });

            res.status(201).send({ uid: userRecord.uid, message: "User created and profile saved." });
        } catch (error) {
            console.error("Error during registration:", error);
            res.status(500).send({ error: "Registration failed. Please try again." });
        }
    });

    return router;
};
