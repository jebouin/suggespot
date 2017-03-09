module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/p/:id", function(req, res) {
			var url = req.originalUrl;
			var id = req.params.id;
			api.makeLocalAPICall("GET", "/api/profile", {userId: id}, function(err, profileData) {
				if(err) {
					res.redirect("/");
					return;
				}
				res.end(view.getTemplate("profile")(profileData));
			});
		});
	}

	return {
		createRoutes: createRoutes
	};
};
