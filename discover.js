const utils = require("./utils");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function discover(req, res, loginData) {
		var params = {};
		if(req.body.lat && req.body.lon) {
			params.lat = req.body.lat;
			params.lon = req.body.lon;
		}
		if(loginData) {
			params.userId = loginData.id;
			loginData.id = loginData.id.toString(36);
		}
		api.makeLocalAPICall("GET", "/api/suggestions", params, function(err, suggestionData) {
			if(err) {
				res.end();
			} else {
				res.end(view.getTemplate("discover")({
					suggestions: suggestionData.suggestions,
					user: loginData
				}));
			}
		});
	}

	function createRoutes() {
		app.get("/discover", function(req, res) {
			auth.checkUserLoggedIn(req, res, function(data) {
				discover(req, res, data);
			}, function() {
				discover(req, res);
			});
		});
	}

	return {
		discover: discover,
		createRoutes: createRoutes
	};
};
