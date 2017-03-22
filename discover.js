const utils = require("./utils");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function discover(req, res, loginData) {
        function sendResponse(templateData) {
            res.end(view.getTemplate("discover")(templateData));
        }
        var templateData = {user: loginData};
        if(req.query.mode) {
            templateData.mode = req.query.mode;
        }
        if(req.query.tag) {
            templateData.tag = req.query.tag;
        }
        if(loginData) {
            api.makeLocalAPICall("GET", "/api/notifications/", {userId: loginData.id}, function(err, data) {
                if(err) {
                    res.status(err.code ? err.code : 500).end();
                    return;
                }
                templateData.notifications = data;
                sendResponse(templateData);
            });
        } else {
            sendResponse(templateData);
        }
	}

	function createRoutes() {
		app.get("/all", function(req, res) {
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
