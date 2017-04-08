const colors = require("colors/safe");
const logs = require("./logs");
const utils = require("./utils");
const crypto = require("crypto");

module.exports = function(app, mysqlConnection, view) {
    
    function testTransactionError(err, beforeCallback) {
        if(err) {
            mysqlConnection.rollback();
            if(beforeCallback) {
                beforeCallback();
            }
            throw err;
        }
    }
    
    function getNewPasswordHash(correctPassword) {
        var salt = utils.getSalt();
        var hash = crypto.createHash("sha256").update("" + correctPassword + salt).digest("hex");
        return {salt: salt, hash: hash};
    }

    function getNewSessionHash(userId) {
        var salt = utils.getSalt();
        var hash = crypto.createHash("sha256").update("" + userId + salt).digest("base64");
        return {salt: salt, hash: hash};
    }

    function changePasswordSalt(userId, correctPassword, callback) {
        var hash = getNewPasswordHash(correctPassword);
        mysqlConnection.query("UPDATE users SET (salt2 = ?, hash = ?) WHERE id = ?", [hash.salt, hash.hash, userId], function(err, rows, fields) {
            if(err) {
                callback(err);
                return;
            }
            callback();
        });
    }

    function changeSessionSalt(userId, callback) {
        var hash = getNewSessionHash(userId);
        mysqlConnection.query("UPDATE users SET salt = ? WHERE id = ?", [hash.salt, hash.hash], function(err, rows, fields) {
            if(err) {
                callback(err);
                return;
            }
            callback(null, hash);
        });
    }
    
    function checkUser(name, email, password, password2, callback) {
        var errors = [];
        var emailLocal, emailDomain;
        function checkUsername(callback) {
            if(name.length < 3) {
                errors.push("U_TS");
            } else if(name.length > 20) {
                errors.push("U_TL");
            } else if(!name.match(/^[a-zA-Z0-9_]+$/)) {
                errors.push("U_INV");
            }
            mysqlConnection.query("SELECT id FROM users WHERE name = ?", [name], function(err, rows, fields) {
                if(err) {
                    callback(err);
                    return;
                }
                if(rows.length > 0) {
                    errors.push("U_EX");
                }
                callback();
            });
        }
        function checkEmail() {
            if(email.length > 320) {
                errors.push("E_TL");
                return;
            }
            var emailObject = utils.separateEmail(email);
            if(emailObject === null) {
                errors.push("E_INV");
            } else {
                emailLocal = emailObject.local;
                emailDomain = emailObject.domain;
                if(emailLocal.length > 64 || emailDomain.length > 255) {
                    errors.push("E_TL");
                    return;
                }
            }
        }
        function checkPassword() {
            if(password != password2) {
                errors.push("P_DM");
            }
            if(password.length < 10) {
                errors.push("P_TS");
            } else if(password.length > 255) {
                errors.push("P_TL");
            } else if(!password.match(/^[A-Z0-9 !"#\$%&'()*+,-\.\/:;<=>?@[\\\]^_`{|}~]+$/i)) {
                errors.push("P_INV");
            }
        }
        try {
            checkUsername(function(err) {
                if(err) throw err;
                checkEmail();
                checkPassword();
                callback(null, errors, emailLocal, emailDomain);
            });
        } catch(e) {
            console.log(e);
            callback(e);
            return;
        }
    }

    function createUser(name, emailLocal, emailDomain, password, callback) {
        mysqlConnection.beginTransaction(function(err) {
            testTransactionError(err);
            mysqlConnection.query("INSERT INTO users (name) VALUES (?)", [name], function(err, rows, fields) {
                testTransactionError(err);
                var userId = rows.insertId;
                mysqlConnection.query("INSERT INTO emails (local, domain, user) VALUES (?, ?, ?)", [emailLocal, emailDomain, userId], function(err, rows, fields) {
                    testTransactionError(err);
                    mysqlConnection.query("INSERT INTO preferences (user) VALUES (?)", [userId], function(err, rows, fields) {
                        testTransactionError(err);
                        mysqlConnection.commit(function(err) {
                            testTransactionError(err);
                            callback(userId);
                        });
                    });
                });
            });
        });
    }

	function createRoutes() {
		app.post("/register", function(req, res) {
            try {
                var username = utils.checkParam(req.body, "username");
                var email = utils.checkParam(req.body, "email");
                var password = utils.checkParam(req.body, "password");
                var password2 = utils.checkParam(req.body, "password2");
            } catch(e) {
                res.status(400).end(e.message);
                return;
            }
            checkUser(username, email, password, password2, function(err, errors, emailLocal, emailDomain) {
                if(err) {
                    res.status(500).end();
                    return;
                }
                if(errors && errors.length > 0) {
                    res.status(200).json({errors: errors});
                    return;
                } else {
                    try {
                        createUser(username, emailLocal, emailDomain, password, function(userId) {              
							logs.log("new user " + colors.bold(username));
                            logUserIn(req, res, userId, username, password);
                        });
                    } catch(e) {
                        res.status(500).end();
                    }
                }
            });
		});

		app.get("/register", function(req, res) {
			res.redirect("/discover");
		});

		app.post("/login", function(req, res) {
            try {
                var username = utils.checkParam(req.body, "username");
                var password = utils.checkParam(req.body, "password");
            } catch(e) {
                res.status(400).end(e.message);
            }
			mysqlConnection.query('SELECT id, salt2, hash FROM users WHERE name = ?', [username], function(err, rows, fields) {
				if(err) throw err;
				if(rows.length === 0) {
					res.status(200).json({errors: ["U_NF"]});
                    return;
				}
                var userData = rows[0];
                var hash = crypto.createHash("sha256").update("" + password + userData.salt2).digest("hex");
                if(hash !== userData.hash && userData.hash !== null) {
                    res.status(200).json({errors: ["P_IN"]});
                    return;
                }
                logUserIn(req, res, userData.id, username, password);
			});
		});

		app.get("/logout", function(req, res) {
			checkUserLoggedIn(req, res, function(data) {
				logs.log("user " + colors.bold(data.name) + " logged out");
				res.clearCookie("uid");
				res.clearCookie("uid2");
				res.redirect("/");
			});
		});
	}

	function logUserIn(req, res, id, name, password) {
        var sessionHash = getNewSessionHash(id);
        var passwordHash = getNewPasswordHash(password);
        var params = [sessionHash.salt, passwordHash.salt, passwordHash.hash, id];
        var uid = id.toString(36);
        mysqlConnection.query('UPDATE users SET salt = ?, salt2 = ?, hash = ? WHERE id = ?', params, function(err, rows, fields) {
			if(err) throw err;
			res.cookie("uid", uid, {expires: utils.getMonthsFromNow(1)});
			res.cookie("uid2", sessionHash.hash, {expires: utils.getMonthsFromNow(1)});
			logs.log("user " + colors.bold(name) + " logged in");
            if(req.method === "GET") {
                res.redirect("/");
            } else if(req.method === "POST") {
                res.status(200).end("/p/" + uid);
            }
		});
	}

	function checkUserLoggedIn(req, res, yesCallback, noCallback, errCallback) {
		if(req.cookies.uid) {
            var uid = parseInt(req.cookies.uid, 36);
            mysqlConnection.query('SELECT id, name, salt FROM users WHERE id = ?', [uid], function(err, rows, fields) {
				if(err) throw err;
				function wrongHash() {
					//logs.log(colors.bold("unknown user tried to log with id " + req.cookies.uid + " from " + req.ip)); //happens when you change device
					res.clearCookie("uid");
					res.clearCookie("uid2");
					res.end(view.getTemplate("index")());
				}
                if(rows.length == 1) {
					var hash = crypto.createHash("sha256").update("" + uid + rows[0].salt).digest("base64");
                    if(hash === req.cookies.uid2) {
						yesCallback({id: uid.toString(36), name: rows[0].name});
					} else {
						wrongHash();
					}
				} else {
					wrongHash();
				}
			});
		} else {
			if(noCallback) {
				noCallback();
			} else {
				if(req.originalUrl != "/") {
					res.redirect("/");
				} else {
					res.end(view.getTemplate("index")());
				}
			}
		}
	}

	return {
		createRoutes: createRoutes,
		logUserIn: logUserIn,
		checkUserLoggedIn: checkUserLoggedIn
	};
};
