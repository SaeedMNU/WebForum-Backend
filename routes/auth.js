// routes/auth.js
var express = require("express");
module.exports = function (auth, dbFirestore, admin, fetch, firebaseApiKey) {
    var router = express.Router();

    // Register Route
    router.post("/register", async (req, res) => {
        try {
            const { email, password, username } = req.body;

            // Set the record set into firebase auth
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

    // Login Route using Firebase’s REST API
    router.post("/login", async (req, res) => {
        try {
            const { email, password } = req.body;
            const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ? data.error.message : "Unknown error during login.");
            }
            res.status(200).send(data);
        } catch (error) {
            console.error("Error during login:", error.message);
            res.status(401).send({ message: "Login failed. " + error.message });
        }
    });

    // Auth State Route to verify the ID token and return user info
    router.get("/authState", async (req, res) => {
        try {
            const token = req.headers.authorization?.split("Bearer ")[1];
            if (!token) {
                return res.status(401).send({ isAuthenticated: false });
            }
            const decodedToken = await auth.verifyIdToken(token);
            const userRecord = await auth.getUser(decodedToken.uid);
            res.status(200).send({
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                isAuthenticated: true
            });
        } catch (error) {
            console.error("Error verifying authentication state:", error);
            res.status(401).send({ isAuthenticated: false });
        }
    });

    return router;
};
