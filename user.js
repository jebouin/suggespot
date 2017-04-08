const async = require("async");
const crypto = require("crypto");
const utils = require("./utils");

module.exports = function(app, mysqlConnection, auth, view, api) {

	function createRoutes() {
		app.get("/p/:id", function(req, res) {
            var url = req.originalUrl;
			var id = req.params.id;
            function getProfile(loginData) {
                api.makeLocalAPICall("GET", "/api/user", {userId: id}, function(err, profileData) {
    				if(err) {
    					res.redirect("/");
                        throw err;
    				}
                    if(loginData && Object.keys(loginData).length > 0) {
                        profileData.user = loginData;
                    }
                    api.makeLocalAPICall("GET", "/api/userTags", {userId: id}, function(err, tagData) {
                        if(err) {
                            res.redirect("/");
                            throw err;
                        }
                        profileData.tags = tagData;
                        sendProfile(profileData);
                    });
    			});
            }
            function sendProfile(profileData) {
                res.status(200).end(view.getTemplate("profile")(profileData));
            }
            auth.checkUserLoggedIn(req, res, function(loginData) {
                getProfile(loginData);
            }, function() {
                getProfile();
            });
		});

        app.post("/follow", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/follow", {userId: loginData.id, tagName: req.body.tagName}, function(err, followData) {
                    res.status(200).end();
                });
            }, function() {
                res.status(402).end();
            });
        });

        app.post("/unfollow", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                api.makeLocalAPICall("POST", "/api/unfollow", {userId: loginData.id, tagName: req.body.tagName}, function(err, followData) {
                    res.status(200).end();
                }, function() {
                    res.status(402).end();
                });
            });
        });

        app.post("/users", function(req, res) {
            var body = req.body;
            auth.checkUserLoggedIn(req, res, function(loginData) {
                body.userId = loginData.id;
                api.makeLocalAPICall("GET", "/api/users", body, function(err, userData) {
                    res.status(200).json(userData);
                });
            }, function() {
                res.status(401).end();
            });
        });

        app.get("/recover/password", function(req, res) {
           res.status(200).end(view.getTemplate("recoverPassword")()); 
        });

        app.post("/recover/password", function(req, res) {
            auth.checkUserLoggedIn(req, res, function(loginData) {
                res.status(403).end("already logged in");
            }, function() {
                var email = req.body.email;
                if(typeof(email) === "undefined") {
                    res.status(400).end();
                    return;
                }
                var emailObject = utils.separateEmail(email);
                if(emailObject === null) {
                    res.status(200).end("E_INV");
                    return;
                }
                mysqlConnection.query("SELECT user FROM emails WHERE (local, domain) = (?, ?)", [emailObject.local, emailObject.domain], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length === 0) {
                        res.status(200).end("U_NF");
                        return;
                    }
                    var userId = rows[0].user;
                    var resetToken = crypto.randomBytes(32);
                    var resetExpires = new Date();
                    var resetHash = crypto.createHash("sha256").update(resetToken).digest("hex");
                    resetExpires.setMinutes(resetExpires.getMinutes() + 20);
                    mysqlConnection.query("UPDATE users SET resetHash = ?, resetExpires = ? WHERE id = ?", [resetHash, resetExpires, userId], function(err, rows, fields) {
                        if(err) throw err;
                        //send hash
                        var resetLink = "http://" + req.headers.host + "/reset/" + resetToken.toString("hex");
                        console.log("Here is your reset link: " + resetLink);
                        console.log("It will expire in 20 minutes. If you did not request blablabla");
                        res.status(200).end();
                    });
                });
            });
        });
	}

	return {
		createRoutes: createRoutes
	};
};
