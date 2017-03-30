const async = require("async")

module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/p/:id", function(req, res) {
            var url = req.originalUrl;
			var id = req.params.id;
            function getProfile(loginData) {
                var loggedIn = typeof loginData !== "undefined";
                api.makeLocalAPICall("GET", "/api/user", {userId: id}, function(err, profileData) {
    				if(err) {
                        throw err;
    					res.redirect("/");
    					return;
    				}
                    api.makeLocalAPICall("GET", "/api/userTags", {userId: id}, function(err, tagData) {
                        if(err) {
                            throw err;
                            res.redirect("/");
                            return;
                        }
                        profileData.tags = tagData;
                        profileData.authorId = id;
                        sendProfile(profileData);
                    });
    			});
            }
            function sendProfile(profileData) {
                res.status(200).end(view.getTemplate("profile")(profileData));
            }
            auth.checkUserLoggedIn(req, res, function(loginData) {
                getProfile(loginData);
            }, function() {
                getProfile();
            });
		});

        app.post("/follow", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/follow", {userId: loginData.id, tagName: req.body.tagName}, function(err, followData) {
                    res.status(200).end();
                });
            }, function() {
                res.status(402).end();
            });
        });

        app.post("/unfollow", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/unfollow", {userId: loginData.id, tagName: req.body.tagName}, function(err, followData) {
                    res.status(200).end();
                }, function() {
                    res.status(402).end();
                });
            });
        });

        app.post("/users", function(req, res) {
            var body = req.body;
            auth.checkUserLoggedIn(req, res, function(loginData) {
                body.userId = loginData.id;
                api.makeLocalAPICall("GET", "/api/users", body, function(err, userData) {
                    res.status(200).json(userData);
                });
            }, function() {
                res.status(401).end();
            });
        });
	}

	return {
		createRoutes: createRoutes
	};
};
