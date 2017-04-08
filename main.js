const logs = require("./logs");
logs.log("starting server...");
const fs = require("fs");
global.config = JSON.parse(fs.readFileSync("config.json"));
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

app.use(express.static(global.config.uploadDir));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

const utils = require("./utils");
const view = require("./view")(app);
const auth = require("./auth")(app, connection, view);
const api = require("./api")(app, connection, auth);
const suggestion = require("./suggestion")(app, connection, auth, view, api);
const discover = require("./discover")(app, connection, auth, view, api);
const user = require("./user")(app, connection, auth, view, api);
const preferences = require("./preferences")(app, connection, auth, view, api);
const cleaner = require("./cleaner")(app, connection);
const digest = require("./digest")(connection);

connection.connect();
digest.init(createRoutes);
//cleaner.clean(createRoutes);

function createRoutes() {
    auth.createRoutes();
    discover.createRoutes();
    suggestion.createRoutes();
    user.createRoutes();
    preferences.createRoutes();

    app.use(function(req, res, next) {
    	for(var i = 0; i < global.config.allowedIPs.length; i++) {
    		if(req.ip === global.config.allowedIPs[i]) {
    			next();
    			return;
    		}
    	}
    	logs.log("Unauthorized ip " + req.ip);
    	return res.status(401).send("Soon...");
    });

    app.get("/", function(req, res) {
        req.query.mode = "interests";
        auth.checkUserLoggedIn(req, res, function(data) {
    		discover.discover(req, res, data);
    	});
    });

    app.get("/terms", function(req, res) {
        res.end(view.getTemplate("terms")());
    });

    app.get("/privacy", function(req, res) {
        res.end(view.getTemplate("privacy")());
    });


    app.use("/style", express.static(__dirname + "/view/style"));

    app.get("/libs/*.js", function(req, res) {
    	utils.sendFile(res, req.url);
    });

    app.get(["/view/scripts/*", "/view/svg/*"], function(req, res) {
    	try {
    		utils.sendFile(res, req.url);
    	} catch(e) {
    		res.status(404).end();
    	}
    });

    app.get("/uploads/*", function(req, res) {
    	try {
    		utils.sendFile(res, req.url);
    	} catch(e) {
    		res.status(404).end();
    	}
    });

    var server = app.listen(80, function() {
        logs.log(colors.bold("server started"));
    });

    /*app._router.stack.forEach(function(r) {
        if(r.route && r.route.path){
            console.log(r.route.path);
        }
    });*/
}

process.on("SIGINT", function() {
	logs.log("closing server...");
	connection.end();
	logs.log(colors.bold("server closed"));
	logs.close();
	process.exit();
});
