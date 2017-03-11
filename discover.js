const utils = require("./utils");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function discover(req, res, loginData) {
		var params = {};
		if(req.body.lat && req.body.lon) {
			params.lat = req.body.lat;
			params.lon = req.body.lon;
		}
        if(req.query.tag) {
            params.categoryName = req.query.tag;
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
                    tag: suggestionData.tag,
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
