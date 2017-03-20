const utils = require("./utils");
const logs = require("./logs");
const qs = require("querystring");

module.exports = function(app, mysqlConnection, auth, view, api) {

    function sendSuggestions(req, res, loginData) {
        var params = {};
        if(loginData) {
			params.userId = loginData.id;
			loginData.id = loginData.id.toString(36);
		}
        if(req.body.lat && req.body.lon) {
			params.lat = req.body.lat;
			params.lon = req.body.lon;
		}
        if(req.body.tag) {
            params.tagName = req.body.tag;
            req.body.mode = "tag";
        }
        if(req.body.authorId) {
            params.authorId = req.body.authorId;
        }
        params.start = req.body.start || 0;
        params.limit = req.body.limit || 10;
        var mode = req.body.mode || "all";
        api.makeLocalAPICall("GET", "/api/suggestions/" + mode, params, function(err, suggestionData) {
            if(err) {
				res.end();
			} else {
                res.end(view.getTemplate("suggestionUI")({
					suggestions: suggestionData.suggestions,
                    tag: suggestionData.tag,
					user: loginData
				}));
			}
        });
    }

	function createRoutes() {
        app.post("/suggestions", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(data) {
                sendSuggestions(req, res, data);
            }, function() {
                sendSuggestions(req, res);
            });
        });

        app.get("/s/:id", function(req, res) {
            var url = req.originalUrl;
            var id = req.params.id;
            function apiCall(loginData) {
                api.makeLocalAPICall("GET", "/api/suggestion/" + id, loginData ? loginData : {}, function(err, suggestionData) {
                    if(err) {
                        res.redirect("/");
                        return;
                    }
                    if(loginData) {
                        suggestionData.user = loginData;
                        suggestionData.user.id = suggestionData.user.id.toString(36);
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

        app.post("/s/:id/d", function(req, res) {
            api.makeLocalAPICall("POST", "/api/suggestion/" + req.params.id + "/distance", req.body, function(err, data) {
                if(err) {
                    res.status(err.code ? err.code : 500).end();
                    return;
                }
                res.status(200).json(data);
            });
        });

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

		app.post("/uploadPhoto", function(req, res) {
			res.redirect(307, "/api/upload");
		});

        app.post("/deletePhoto", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(data) {
                api.makeLocalAPICall("POST", "/api/delete", {userId: data.id, thingId: req.body.thingId}, function(err, deleteData) {
                    if(err) {
                        res.status(err.code ? err.code : 500).end();
                        return;
                    }
                    res.status(200);
                    res.end();
                });
            });
        });

        app.get("/t", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(data) {
                api.makeLocalAPICall("GET", "/api/tags", req.query, function(err, tagData) {
                    if(err) {
                        res.status(err.code ? err.code : 500).end();
                    }
                    res.status(200).json(tagData);
                })
            });
        });

		app.post("/publish", function(req, res) {
			var id = req.body.sid;
			auth.checkUserLoggedIn(req, res, function(data) {
				api.makeLocalAPICall("POST", "/api/publish", {userId: data.id, suggestionId: id}, function(err, publishData) {
					if(err) {
						res.status(err.code ? err.code : 500).end();
						return;
					}
					res.status(200).end();
				});
			});
		});

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

        app.post("/report", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                var params = req.body;
				params.userId = loginData.id;
                api.makeLocalAPICall("POST", "/api/report", params, function(err, data) {
                    if(err) {
                        res.status(err.code ? err.code : 500).end();
                        return;
                    }
                    res.status(200).end();
                })
            }, function() {
                res.status(401).end();
            });
        });
	}

	return {
		createRoutes: createRoutes
	};
};
