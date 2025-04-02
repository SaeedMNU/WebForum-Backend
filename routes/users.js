// routes/users.js
var express = require("express");
module.exports = function (dbFirestore, admin, upload) {
    var router = express.Router();

    // Existing GET route
    router.get("/:uid", async (req, res) => {
        try {
            const uid = req.params.uid;
            const userDoc = await dbFirestore.collection("users").doc(uid).get();
            if (userDoc.exists) {
                res.status(200).send(userDoc.data());
            } else {
                res.status(404).send({ error: "User not found" });
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            res.status(500).send({ error: "Failed to fetch user profile" });
        }
    });

    // New PUT route for updating the bio (if not already there)
    router.put("/:uid", async (req, res) => {
        try {
            const uid = req.params.uid;
            const { bio } = req.body;
            if (typeof bio !== "string") {
                return res.status(400).send({ error: "Invalid bio" });
            }
            await dbFirestore.collection("users").doc(uid).update({ bio: bio });
            const updatedDoc = await dbFirestore.collection("users").doc(uid).get();
            res.status(200).send(updatedDoc.data());
        } catch (error) {
            console.error("Error updating user profile:", error);
            res.status(500).send({ error: "Failed to update user profile" });
        }
    });

    // New POST route for uploading a profile picture
    router.post(
        "/:uid/uploadProfilePicture",
        upload.single("profilePicture"),
        async (req, res) => {
            try {
                const uid = req.params.uid;
                const file = req.file;
                if (!file) {
                    return res.status(400).send({ error: "No file uploaded" });
                }
                // Create a unique file name. For example, use the uid and timestamp.
                const fileName = `profilePictures/${uid}_${Date.now()}_${file.originalname}`;

                // Reference the default bucket from Firebase Admin
                const bucket = admin.storage().bucket();
                const fileUpload = bucket.file(fileName);

                // Create a stream to upload the file
                const stream = fileUpload.createWriteStream({
                    metadata: {
                        contentType: file.mimetype
                    }
                });

                stream.on("error", (error) => {
                    console.error("Error during file upload:", error);
                    return res.status(500).send({ error: "Unable to upload file" });
                });

                stream.on("finish", async () => {
                    // Make the uploaded file publicly accessible (or adjust your security rules)
                    await fileUpload.makePublic();
                    // Get the public URL of the uploaded file
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    // Update the Firestore user document with the new profile picture URL
                    await dbFirestore.collection("users").doc(uid).update({ profile_picture: publicUrl });
                    res.status(200).send({ profile_picture: publicUrl });
                });

                // End the stream with the file buffer
                stream.end(file.buffer);
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                res.status(500).send({ error: "Upload failed" });
            }
        }
    );

    return router;
};
