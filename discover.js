const utils = require("./utils");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function discover(req, res, loginData) {
        var templateData = {user: loginData};
        if(req.query.mode) {
            templateData.mode = req.query.mode;
        }
        if(req.query.tag) {
            templateData.tag = req.query.tag;
        }
        res.end(view.getTemplate("discover")(templateData));
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
