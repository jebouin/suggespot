module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/p/:id", function(req, res) {
			var url = req.originalUrl;
			var id = req.params.id;
            function getProfile(isAuthor) {
                api.makeLocalAPICall("GET", "/api/profile", {userId: id}, function(err, profileData) {
    				if(err) {
    					res.redirect("/");
    					return;
    				}
                    if(isAuthor) {
                        api.makeLocalAPICall("GET", "/api/suggestions", {userId: id, authorId: id}, function(err, suggestionData) {
                            if(err) {
                                res.redirect("/");
                                return;
                            }
                            profileData.suggestions = suggestionData.suggestions;
                            sendProfile(profileData);
                        });
                    } else {
                        sendProfile(profileData);
                    }
    			});
            }
            function sendProfile(profileData) {
                res.end(view.getTemplate("profile")(profileData));
            }
            auth.checkUserLoggedIn(req, res, function(loginData) {
                getProfile(true);
            }, function() {
                getProfile(false);
            });

		});
	}

	return {
		createRoutes: createRoutes
	};
};
