module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/profile", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				res.end(view.getTemplate("profile")({user: data}));
			});
		});
	}

	return {
		createRoutes: createRoutes
	};
};