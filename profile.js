module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get(/^\/p\//, function(req, res) {
			var url = req.originalUrl;
			var id = url.substr(url.search("/p/") + 3);
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