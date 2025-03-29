// Necessary require/import values
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

// Referencing MongoDB database connection details
let dbPprefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

// Connects to the database via the connection details using the Node.js driver
const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);

// Middleware: Returns lesson images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Middleware: Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});


// Starts and logs the server start on the given port
app.listen(5000, function () {
    console.log("App started on port 5000");
});
