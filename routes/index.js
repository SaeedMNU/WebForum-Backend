// routes/index.js
var express = require("express");
module.exports = function (db, auth, dbFirestore, admin, fetch, firebaseApiKey) {
    var router = express.Router();

    // Load our feature routes:
    var authRoutes = require("./auth")(auth, dbFirestore, admin, fetch, firebaseApiKey);

    // Mount under appropriate subpaths
    router.use("/auth", authRoutes);    // For /api/auth/*

    return router;
};
