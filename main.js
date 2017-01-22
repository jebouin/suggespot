const logs = require("./logs");
logs.log("starting server...");
const fs = require("fs");
global.config = JSON.parse(fs.readFileSync("config.json"));
global.rootDir = global.config.rootDir;
const express = require("express");
const app = express();
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const colors = require("colors/safe");
var connection = mysql.createConnection({
	host : "localhost",
	user : "root",
	password : global.config.passwords.database,
	database : "suggespot",
	charset : "utf8mb4"
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

const utils = require("./utils");
const api = require("./api")(app, connection);
const view = require("./view")(app);
const auth = require("./auth")(app, connection, view);
const suggestion = require("./suggestion")(app, connection, auth, view, api);
const discover = require("./discover")(app, connection, auth, view, api);

connection.connect();
auth.createRoutes();
discover.createRoutes();
suggestion.createRoutes();

app.use(function(req, res, next) {
	for(var i = 0; i < global.config.allowedIPs.length; i++) {
		if(req.ip === global.config.allowedIPs[i]) {
			next();
			return;
		}
	}
	logs.log("Unauthorized ip " + req.ip);
	res.status(401);
	return res.send("Soon...");
});

app.get("/", function(req, res) {
	auth.checkUserLoggedIn(req, res, function(data) {
		discover.discover(req, res, data);
	});
});

app.get("/indexDivs.html", function(req, res) {
	utils.sendFile(res, "view/indexDivs.html");
});

app.get("/style.css", function(req, res) {
	utils.sendFile(res, "view/style.css");
});

app.get("/libs/jquery.js", function(req, res) {
	utils.sendFile(res, "libs/jquery.js");
});

app.get("/view/scripts/*", function(req, res) {
	try {
		utils.sendFile(res, req.url);
	} catch(e) {
		res.status(404);
		res.end();
	}
});

var server = app.listen(80, function() {
	logs.log(colors.bold("server started"));
});

process.on("SIGINT", function() {
	logs.log("closing server...");
	connection.end();
	logs.log(colors.bold("server closed"));
	logs.close();
	process.exit();
});