const utils = require("./utils");
const logs = require("./logs");
const qs = require("querystring");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.post("/vote", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				api.makeLocalAPICall("POST", "/api/vote", {suggestionID: req.body.suggestionID, userID: data.id, voteType: req.body.voteType}, function(err, data) {
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
						res.redirect("/");
					}
				});
			});
		});

		app.get(/\/s\//, function(req, res) {
			var url = req.originalUrl;
			var id = url.substr(url.search("/s/") + 3);
			api.makeLocalAPICall("GET", "/api/suggestion/" + id, {}, function(err, suggestionData) {
				if(err) {
					res.redirect("/");
					return;
				}
				res.end(view.getTemplate("suggestion")(suggestionData));
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
						res.redirect("/s/" + req.body.suggestionID);
					}
				});
			});
		});
	}

	return {
		createRoutes: createRoutes
	}
};
