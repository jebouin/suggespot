const utils = require("./utils");
const logs = require("./logs");
const qs = require("querystring");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.post("/vote", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				api.makeLocalAPICall("POST", "/api/vote", {thingId: req.body.thingId, userId: data.id, dir: req.body.dir}, function(err, data) {
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
				params.userId = data.id;
				api.makeLocalAPICall("POST", "/api/submit", params, function(err, data) {
					if(err) {
						res.redirect("/");
					} else {
						var sid = data;
						api.makeLocalAPICall("POST", "/api/vote", {thingId: "0_" + data, userId: params.userId, dir: 1}, function(err, data) {
							if(err) {
								res.redirect("/");
							} else {
								res.redirect("/s/" + sid);
							}
						});
					}
				});
			});
		});

		app.post("/edit", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				api.makeLocalAPICall("POST", "/api/edit", {user: data, edit: req.body}, function(err, editData) {
					if(err) {
						res.status(500);
						res.end();
						return;
					}
					res.status(200);
					res.end();
				});
			})
		});

		app.post("/upload", function(req, res) {
			res.redirect(307, "/api/upload");
		});

		app.post("/publish", function(req, res) {
			var id = req.body.sid;
			auth.checkUserLoggedIn(req, res, function(data) {
				api.makeLocalAPICall("POST", "/api/publish", {userId: data.id, suggestionId: id}, function(err, publishData) {
					if(err) {
						res.status(err.code ? err.code : 500);
						res.end();
						return;
					}
					res.status(200);
					res.end();
				});
			});
		})

		app.post("/comment", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				var params = req.body;
				params.userId = data.id;
				api.makeLocalAPICall("POST", "/api/comment", params, function(err, data) {
					if(err) {
						res.redirect("/s/" + req.body.suggestionId);
					} else {
						api.makeLocalAPICall("POST", "/api/vote", {thingId: "1_" + data, userId: params.userId, dir: 1}, function(err, data) {
							res.redirect("/s/" + req.body.suggestionId);
						});
					}
				});
			});
		});

		app.get(/^\/s\//, function(req, res) {
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
