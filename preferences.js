module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/preferences", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				res.end(view.getTemplate("preferences")({user: data}));
			});
		});
	}

	return {
		createRoutes: createRoutes
	};
};
