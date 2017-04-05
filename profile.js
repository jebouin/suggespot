const async = require("async");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/p/:id", function(req, res) {
            var url = req.originalUrl;
			var id = req.params.id;
            function getProfile(loginData) {
                api.makeLocalAPICall("GET", "/api/user", {userId: id}, function(err, profileData) {
    				if(err) {
    					res.redirect("/");
                        throw err;
    				}
                    if(loginData && Object.keys(loginData).length > 0) {
                        profileData.user = loginData;
                    }
                    api.makeLocalAPICall("GET", "/api/userTags", {userId: id}, function(err, tagData) {
                        if(err) {
                            res.redirect("/");
                            throw err;
                        }
                        profileData.tags = tagData;
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
