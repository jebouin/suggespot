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
    					res.redirect("/");
    					return;
    				}
                    var isAuthor = loggedIn && (profileData.id === parseInt(loginData.id, 36));
                    if(isAuthor) {
                        api.makeLocalAPICall("GET", "/api/suggestions", {userId: id, authorId: id}, function(err, suggestionData) {
                            if(err) {
                                res.redirect("/");
                                return;
                            }
                            profileData.suggestions = suggestionData.suggestions;
                            api.makeLocalAPICall("GET", "/api/userTags", {userId: id}, function(err, tagData) {
                                if(err) {
                                    res.redirect("/");
                                    return;
                                }
                                profileData.tags = tagData;
                                sendProfile(profileData);
                            });
                        });
                    } else {
                        sendProfile(profileData);
                    }
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
            });
        });

        app.post("/unfollow", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/unfollow", {userId: loginData.id, tagName: req.body.tagName}, function(err, followData) {
                    res.status(200).end();
                });
            });
        });
	}

	return {
		createRoutes: createRoutes
	};
};
