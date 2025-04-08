var express = require("express");
module.exports = function (db, auth, dbFirestore, admin, fetch, firebaseApiKey, upload) {
  var router = express.Router();

  // Mounting routes
  var authRoutes = require("./auth")(auth, dbFirestore, admin, fetch, firebaseApiKey);
  var mediaRoutes = require("./media")(db, require("mongodb").ObjectId);
  var userRoutes = require("./users")(dbFirestore, admin, upload);
  var mediaListsRoutes = require("./mediaLists")(db);
  var forumRoutes = require("./forums")(db);
  var topicsRoutes = require("./topics")(db, dbFirestore);
  var postsRoutes = require("./posts")(db, dbFirestore);

  router.use("/auth", authRoutes);
  router.use("/media", mediaRoutes);
  router.use("/users", userRoutes);
  router.use("/medialist", mediaListsRoutes);
  router.use("/forums", forumRoutes);
  router.use("/topics", topicsRoutes);
  router.use("/posts", postsRoutes);

  return router;
};
