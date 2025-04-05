var express = require("express");
module.exports = function (db, auth, dbFirestore, admin, fetch, firebaseApiKey, upload) {
  var router = express.Router();

  // Mount routes
  var authRoutes = require("./auth")(auth, dbFirestore, admin, fetch, firebaseApiKey);
  var mediaRoutes = require("./media")(db, require("mongodb").ObjectId);
  var userRoutes = require("./users")(dbFirestore, admin, upload);
  var mediaListsRoutes = require("./mediaLists")(db);

  router.use("/auth", authRoutes);
  router.use("/media", mediaRoutes);
  router.use("/users", userRoutes);
  router.use("/medialist", mediaListsRoutes);

  return router;
};
