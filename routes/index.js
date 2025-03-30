// routes/index.js
var express = require("express");
module.exports = function (db, auth, dbFirestore, admin, fetch, firebaseApiKey) {
    var router = express.Router();

    // Load our feature routes:
    var authRoutes = require("./auth")(auth, dbFirestore, admin, fetch, firebaseApiKey);
    var mediaRoutes = require("./media")(db, require("mongodb").ObjectId);

    // Mount under appropriate subpaths
    router.use("/auth", authRoutes);    // For /api/auth/*
    router.use("/media", mediaRoutes);    // For /api/media/*

    return router;
};
