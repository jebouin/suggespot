const colors = require("colors/safe");
const logs = require("./logs");
const utils = require("./utils");
const crypto = require("crypto");

module.exports = function(app, mysqlConnection, view) {

	function createRoutes() {
		app.post("/register", function(req, res) {
			var username = req.body.username;
			mysqlConnection.query('SELECT id FROM users WHERE name = ?', [username], function(err, rows, fields) {
				if(rows.length) {
					res.redirect("/discover");
				} else {
					mysqlConnection.query('INSERT INTO users (name) VALUES (?)', [username], function(err, rows, fields) {
						if(err) throw err;
						mysqlConnection.query('SELECT id FROM users WHERE name = ?', [username], function(err, rows, fields) {
							if(err) throw err;
							logs.log("new user " + colors.bold(username));
							logUserIn(req, res, rows[0].id, username);
						});
					});
				}
			});
		});

		app.post("/login", function(req, res) {
			var username = req.body.username;
			mysqlConnection.query('SELECT * FROM users WHERE name=?', [username], function(err, rows, fields) {
				if(err) throw err;
				if(rows.length === 0) {
					res.redirect("/");
				} else {
					logUserIn(req, res, rows[0].id, username);
				}
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

	function logUserIn(req, res, id, name) {
		var salt = utils.getSalt();
		mysqlConnection.query('UPDATE users SET salt = ? WHERE id = ?', [salt, id], function(err, rows, fields) {
			if(err) throw err;
			var hash = crypto.createHash("sha256").update("" + id + salt).digest("base64");
			res.cookie("uid", id, {expires: utils.getMonthsFromNow(1)});
			res.cookie("uid2", hash, {expires: utils.getMonthsFromNow(1)});
			res.redirect("/");
			logs.log("user " + colors.bold(name) + " logged in");
		});
	}

	function checkUserLoggedIn(req, res, yesCallback, noCallback, errCallback) {
		if(req.cookies.uid) {
			mysqlConnection.query('SELECT id, name, salt FROM users WHERE id=?', [req.cookies.uid], function(err, rows, fields) {
				if(err) throw err;
				function wrongHash() {
					//logs.log(colors.bold("unknown user tried to log with id " + req.cookies.uid + " from " + req.ip)); //happens when you change device
					res.clearCookie("uid");
					res.clearCookie("uid2");
					res.end(view.getTemplate("index")());
				}
				if(rows.length == 1) {
					var hash = crypto.createHash("sha256").update("" + req.cookies.uid + rows[0].salt).digest("base64");
					if(hash === req.cookies.uid2) {
						yesCallback(rows[0]);
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
				res.end(view.getTemplate("index")());
			}
		}
	}

	return {
		createRoutes: createRoutes,
		logUserIn: logUserIn,
		checkUserLoggedIn: checkUserLoggedIn
	};
};
