const utils = require("./utils");

module.exports = function(app, auth, view, api) {

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
        function getPopularTags(callback) {
            api.makeLocalAPICall("GET", "/api/tags/popular", {lat: req.query.lat, lon: req.query.lon}, function(err, data) {
                if(err) {
                    callback(err);
                    return;
                }
                callback(null, data);
            });
        }
        function getDiscoverData() {
            if(loginData) {
                api.makeLocalAPICall("GET", "/api/users/notifications/", {userId: loginData.id}, function(err, data) {
                    if(err) {
                        res.status(err.code ? err.code : 500).end();
                        return;
                    }
                    templateData.notifications = data;
                    sendResponse(templateData);
                });
            } else {
                sendResponse();
            }
        }
        /*getPopularTags(function(err, tagData) {
            templateData.popularTags = tagData;
            getDiscoverData();
        });*/
        getDiscoverData();
	}

	function createRoutes() {
		app.get("/all", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(data) {
                discover(req, res, data);
            }, function() {
                discover(req, res);
            });
        });

        app.post("/users/notifications/mark/seen", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/users/notifications/mark/seen", {userId: loginData.id, notificationId: req.body.nid}, function(err, data) {
                    if(err) {
                        res.status(err.code ? err.code : 500).end();
                        return;
                    }
                    res.status(200).end();
                });
            });
        });

        app.post("/tags/popular", function(req, res) {
            api.makeLocalAPICall("GET", "/api/tags/popular", {lat: req.body.lat, lon: req.body.lon}, function(err, tagData) {
                if(err) {
                    res.status(err.code ? err.code : 500).end();
                    return;
                }
                res.status(200).end(view.getTemplate("popularTags")({popularTags: tagData}));
            });
        });
	}

	return {
		discover: discover,
		createRoutes: createRoutes
	};
};
