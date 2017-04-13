module.exports = function(app, auth, view, api) {

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

        app.post("/editPreferences", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/users/preferences/edit", {userId: loginData.id, editObject: req.body}, function(err, data) {
                    if(err) {
                        res.status(err.code ? err.code : 500).end();
                        return;
                    }
                    res.status(200).end();
                });
            });
        });
	}

	return {
		createRoutes: createRoutes
	};
};
