const utils = require("./utils");
const logs = require("./logs");
const qs = require("querystring");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.post("/vote", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				api.makeLocalAPICall("POST", "/api/vote", {thingID: req.body.thingID, userID: data.id, dir: req.body.dir}, function(err, data) {
					res.end();
				});
			}, function() {
				res.status(401);
				res.end();
			});
		});

		app.get("/submit", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				res.end(view.getTemplate("submit")());
			});
		});

		app.post("/submit", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				var params = req.body;
				params.userID = data.id;
				api.makeLocalAPICall("POST", "/api/submit", params, function(err, data) {
					if(err) {
						res.redirect("/");
					} else {
						api.makeLocalAPICall("POST", "/api/vote", {thingID: "0_" + data, userID: params.userID, dir: 1}, function(err, data) {
							if(err) {
								res.redirect("/");
							} else {
								res.redirect("/s/" + data);
							}
						});
					}
				});
			});
		});

		app.post("/comment", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				var params = req.body;
				params.userID = data.id;
				api.makeLocalAPICall("POST", "/api/comment", params, function(err, data) {
					if(err) {
						res.redirect("/s/" + req.body.suggestionID);
					} else {
						api.makeLocalAPICall("POST", "/api/vote", {thingID: "1_" + data, userID: params.userID, dir: 1}, function(err, data) {
							res.redirect("/s/" + req.body.suggestionID);
						});
					}
				});
			});
		});

		app.get(/\/s\//, function(req, res) {
			var url = req.originalUrl;
			var id = url.substr(url.search("/s/") + 3);
			function apiCall(loginData) {
				api.makeLocalAPICall("GET", "/api/suggestion/" + id, loginData ? loginData : {}, function(err, suggestionData) {
					if(err) {
						res.redirect("/");
						return;
					}
					if(loginData) {
						suggestionData.user = loginData;
					}
					res.end(view.getTemplate("suggestion")(suggestionData));
				});
			}
			auth.checkUserLoggedIn(req, res, function(data) {
				apiCall(data);
			}, function() {
				apiCall();
			});
		});
	}

	return {
		createRoutes: createRoutes
	};
};
