const utils = require("./utils");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function discover(req, res, loginData) {
		/*var params = {};
		if(req.body.lat && req.body.lon) {
			params.lat = req.body.lat;
			params.lon = req.body.lon;
		}
        if(req.query.tag) {
            params.tagName = req.query.tag;
        }
        if(loginData) {
			params.userId = loginData.id;
			loginData.id = loginData.id.toString(36);
		}
        var mode = req.params.mode || "interests";
		api.makeLocalAPICall("GET", "/api/suggestions/" + mode, params, function(err, suggestionData) {
			if(err) {
				res.end();
			} else {
				res.end(view.getTemplate("discover")({
					suggestions: suggestionData.suggestions,
                    tag: suggestionData.tag,
					user: loginData
				}));
			}
		});*/
        res.end(view.getTemplate("discover")({
            user: loginData
        }));
	}

    function sendSuggestions(req, res, loginData) {
        var params = {};
        if(loginData) {
			params.userId = loginData.id;
			loginData.id = loginData.id.toString(36);
		}
        if(req.query.tag) {
            params.tagName = req.query.tag;
        }
        params.start = req.body.start || 0;
        params.limit = req.body.limit || 10;
        api.makeLocalAPICall("GET", "/api/suggestions/all", params, function(err, suggestionData) {
            if(err) {
				res.end();
			} else {
                res.end(view.getTemplate("suggestionUI")({
					suggestions: suggestionData.suggestions,
                    tag: suggestionData.tag,
					user: loginData
				}));
			}
        });
    }

	function createRoutes() {
		app.get("/all", function(req, res) {
            req.params.mode = "all";
			auth.checkUserLoggedIn(req, res, function(data) {
				discover(req, res, data);
			}, function() {
				discover(req, res);
			});
		});
        app.post("/suggestions", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(data) {
                sendSuggestions(req, res, data);
            }, function() {
                sendSuggestions(req, res);
            });
        });
	}

	return {
		discover: discover,
		createRoutes: createRoutes
	};
};
