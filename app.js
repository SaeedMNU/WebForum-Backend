// app.js
var express = require("express");
var path = require("path");
var app = express();

var propertiesReader = require("properties-reader");
var propertiesPath = path.resolve(__dirname, "conf/db.properties");
var properties = propertiesReader(propertiesPath);
app.use(express.json());
const { ObjectId } = require('mongodb');

// Setup static paths
var staticPath = path.join(__dirname, '..', 'WebForum-Frontend');
app.use(express.static(staticPath));

// MongoDB Initialization
let dbPprefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;
const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName); // MongoDB database

// Firebase Admin Initialization
var admin = require("firebase-admin");
var firebaseConfigPath = path.resolve(__dirname, "conf/firebase-admin.json");
try {
    admin.initializeApp({
        credential: admin.credential.cert(require(firebaseConfigPath)),
        storageBucket: "mediaforum-de45d.firebasestorage.app"
    });
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed:", error.message);
}
const auth = admin.auth();
const dbFirestore = admin.firestore(); // Firestore database

// node-fetch setup using dynamic import
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
const firebaseApiKey = "AIzaSyDw4g5U5kkh2uqT3ilBpRBGIIBJKJUQmMc";

// File upload handler
const multer = require("multer");
const storageMulter = multer.memoryStorage();
const upload = multer({ storage: storageMulter });

// Middleware for serving static image files (if required)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Mount API Router (combine your feature routers)
var apiRouter = require("./routes")(db, auth, dbFirestore, admin, fetch, firebaseApiKey, upload);
app.use("/api", apiRouter);

// Start the Server
app.listen(5000, function () {
    console.log("App started on port 5000");
});
