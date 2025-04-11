// routes/auth.js
var express = require("express");
module.exports = function (auth, dbFirestore, admin, fetch, firebaseApiKey) {
    var router = express.Router();

    // Register Route
    router.post("/register", async (req, res) => {
        try {
            const { email, password, username } = req.body;

            // Regex to validate password strength
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordPattern.test(password)) {
                return res.status(400).send({
                    error: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
                });
            }

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
                website_role: "user",
                theme: "",
                notification_settings: {
                    forum_notifications: true,
                    social_notifications: true
                }
            });

            res.status(201).send({ uid: userRecord.uid, message: "User created and profile saved." });
        } catch (error) {
            console.error("Error during registration:", error.message);
            // Extract detailed error message from error.errorInfo if available.
            const errorMessage = error.errorInfo && error.errorInfo.message
                ? error.errorInfo.message
                : "Registration failed. Please try again.";
            res.status(500).send({ error: errorMessage });
        }
    });

    // Login Route using Firebase’s REST API (Identity Toolkit)
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
                return res.status(401).send({ error: "Incorrect email or password." });
            }
            res.status(200).send(data);
        } catch (error) {
            console.error("Error during login:", error.message);
            res.status(401).send({ error: "Login failed. " + error.message });
        }
    });



    // Auth State Route – verify the ID token and return user info
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
