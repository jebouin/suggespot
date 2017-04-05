module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/preferences", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("GET", "/api/users/preferences", {userId: loginData.id}, function(err, preferencesData) {
                    if(err) {
                        res.redirect("/");
                        throw new Error(err.message);
                    }
                    res.end(view.getTemplate("preferences")({user: loginData, preferences: preferencesData}));
                });
			});
		});
	}

	return {
		createRoutes: createRoutes
	};
};
