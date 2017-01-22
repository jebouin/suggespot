//todo: add database error
//todo: generalize errors

const http = require("http");
const rq = require("request");
const logs = require("./logs");

module.exports = function(app, mysqlConnection) {

  function checkUser(id, res, callback) {
    mysqlConnection.query("SELECT name FROM users WHERE id = ?", [id], function(err, rows, fields) {
      if(err) throw err;
      if(rows.length != 1) {
        res.status(404);
        res.end("This user doesn't exist");
        return;
      }
      callback(true, rows[0]);
    });
  };

  app.use("/api/*", function(req, res, next) {
    if(req.ip === "::ffff:127.0.0.1" || req.ip === "127.0.0.1") {
      next();
    } else {
      res.status(401);
      res.end();
    }
  });

  app.get("/api/suggestions", function(req, res) {
    var userID = req.query.user;
    var query;
    var params;
    if(userID) {
      query = "SELECT suggestions.id AS id, title, descr, upvotes, author, up FROM suggestions LEFT JOIN votes ON suggestions.id = votes.suggestion AND user = ?";
      params = [userID];
    } else {
      query = "SELECT id, title, descr, upvotes, author FROM suggestions";
      params = [];
    }
    mysqlConnection.query(query, params, function(err, rows, fields) {
      if(err) throw err;
      for(var i=0; i<rows.length; i++) {
        rows[i].id = rows[i].id.toString(36);
        rows[i].href = "/s/" + rows[i].id;
      }
      res.json({suggestions: rows});
    });
  });

  app.get(/\/api\/suggestion\//, function(req, res) {
    var url = req.originalUrl;
    var id = url.substr(url.search("/suggestion/") + 12);
    if(!(/^[a-zA-Z0-9/=]+$/.test(id))) {
      res.status(400);
      res.end("Invalid suggestion url");
      return;
    }
    id = parseInt(id, 36);
    mysqlConnection.query("SELECT id, title, descr FROM suggestions WHERE id = ?", [id], function(err, rows, fields) {
      if(err) throw err;
      if(rows.length != 1) {
        res.status(404);
        res.end("This suggestion doesn't exist");
        return;
      }
      var suggestionData = rows[0];
      var query = "SELECT content, TIME(timeCreated) AS time, timeCreated AS t, users.name AS author FROM comments INNER JOIN users ON comments.author = users.id AND suggestion = ? ORDER BY t";
      mysqlConnection.query(query, [suggestionData.id], function(err, commentRows, fields) {
        if(err) throw err;
        res.json({title: suggestionData.title, descr: suggestionData.descr, sid: suggestionData.id.toString(36), comments: commentRows});
      });
    });
  });

  app.post("/api/vote", function(req, res) {
    //todo: function to automatically detect missing parameters
    if(!req.body.suggestionID) {
      res.status(400);
      res.end("No suggestion specified");
      return;
    }
    if(!req.body.userID) {
      res.status(400);
      res.end("No userID specified");
      return;
    }
    if(!req.body.voteType) {
      res.status(400);
      res.end("No voteType specified");
      return;
    }
    var suggestionID = parseInt(req.body.suggestionID, 36);
    var userID = req.body.userID;
    var voteType = req.body.voteType;
    checkUser(userID, res, function(ok, row) {
      if(!ok) {
        return;
      }
      var username = row.name;
      mysqlConnection.query('SELECT title FROM suggestions WHERE id = ?', [suggestionID], function(err, rows, fields) {
        if(err) throw err;
        if(rows.length != 1) {
          res.status(404);
          res.end("This suggestion doesn't exist");
          return;
        }
        var suggestionTitle = rows[0].title;
        if(voteType === "cancel") {
          mysqlConnection.query('SELECT id, up FROM votes WHERE suggestion = ? AND user = ?', [suggestionID, userID], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length == 1) {
              var wasUp = rows[0].up;
              mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                if(err) throw err;
                mysqlConnection.query('UPDATE suggestions SET upvotes = upvotes + ? WHERE id = ?', [wasUp ? -1 : 1, suggestionID], function(err, rows, fields) {
                  if(err) throw err;
                  logs.log("user " + colors.bold(username) + " canceled his " + (wasUp ? "up" : "down") + "vote on " + colors.bold(suggestionTitle));
                });
              });
            }
          });
        } else {
          var up = (voteType === "up" ? true : false);
          mysqlConnection.query('SELECT id, up FROM votes WHERE suggestion = ? AND user = ?', [suggestionID, userID], function(err, rows, fields) {
            if(err) throw err;
            function registerVote() {
              mysqlConnection.query('INSERT INTO votes (up, user, suggestion) VALUES (?, ?, ?)', [up, userID, suggestionID], function(err, rows, fields) {
                if(err) throw err;
                logs.log("user " + colors.bold(username) + " " + (up ? "upvoted" : "downvoted") + " an entry " + colors.bold(suggestionTitle));
              });
            }
            if(rows.length == 0) {
              mysqlConnection.query('UPDATE suggestions SET upvotes = upvotes + ? WHERE id = ?', [up ? 1 : -1, suggestionID], function(err, rows, fields) {
                if(err) throw err;
                registerVote();
              });
            } else {
              var wasUp = rows[0].up;
              if(up != wasUp) {
                mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                  if(err) throw err;
                  mysqlConnection.query('UPDATE suggestions SET upvotes = upvotes + ? WHERE id = ?', [up ? 2 : -2, suggestionID], function(err, rows, fields) {
                    if(err) throw err;
                    registerVote();
                  });
                });
              }
            }
          });
        }
        res.status(200);
        res.end();
        return;
      });
    });
  });

  app.post("/api/comment", function (req, res) {
    if(!req.body.suggestionID) {
      res.status(400);
      res.end("No suggestion specified");
      return;
    }
    if(!req.body.userID) {
      res.status(400);
      res.end("No userID specified");
      return;
    }
    if(!req.body.content) {
      res.status(400);
      res.end("No comment specified");
      return;
    }
    var id = parseInt(req.body.suggestionID, 36);
    checkUser(req.body.userID, res, function(ok, row) {
      var username = row.name;
      mysqlConnection.query('SELECT id, title FROM suggestions WHERE id = ?', [id], function(err, rows, fields) {
        if(err) throw err;
        if(rows.length != 1) {
          res.status(404);
          res.end("This suggestion doesn't exist");
          return;
        }
        var suggestionData = rows[0];
        mysqlConnection.query('INSERT INTO comments (author, content, suggestion) VALUES (?, ?, ?)', [req.body.userID, req.body.content, id], function(err, rows, fields) {
          if(err) throw err;
          res.status(201);
          res.end(); //add link to comment
          logs.log("user " + colors.bold(username) + " commented on " + colors.bold(suggestionData.title));
        });
      });
    });
  });

  app.post("/api/submit", function(req, res) {
    var userID = req.body.userID;
    if(!req.body.userID) {
      res.status(400);
      res.end("No userID specified");
      return;
    }
    if(!req.body.title) {
      res.status(400);
      res.end("No title specified");
      return;
    }
    if(!req.body.descr) {
      res.status(400);
      res.end("No description specified");
      return;
    }
    checkUser(userID, res, function(ok, row) {
      var username = row.name;
      var title = req.body.title;
      var descr = req.body.descr;
      var lat = req.body.lat;
      var lon = req.body.lon;
      function removeSpecialChars(str) {
        str = str.replace('\n', '');
        str = str.replace('\r', '');
      }
      removeSpecialChars(title);
      removeSpecialChars(descr);
      var query, params;
  		if(lat != null && lon != null) {
  			lat *= 10000000;
  			lon *= 10000000;
  			query = 'INSERT INTO suggestions (title, descr, lat, lon, author) VALUES (?, ?, ?, ?, ?)';
  			params = [title, descr, lat, lon, userID];
  		} else {
  			query = 'INSERT INTO suggestions (title, descr, author) VALUES (?, ?, ?)';
  			params = [title, descr, userID];
  		}
  		mysqlConnection.query(query, params, function(err, rows, fields) {
  			if(err) throw err;
  			logs.log("user " + colors.bold(username) + " posted a new entry " + colors.bold(title));
  			res.status(201);
        res.end(); //todo: send link to suggestion
        return;
  		});
    });
  })

  return {
    makeLocalAPICall: function(method, path, params, callback) {
      function reqCallback(err, res, body) {
        if(err) {
          if(callback) callback(err, null);
        } else {
          if(callback) callback(null, body);
        }
      }
      if(method == "GET") {
        rq({
          uri: "http://localhost:80" + path,
          json: true,
          qs: params,
          method: "GET",
        }, reqCallback);
      } else if(method == "POST") {
        rq({
          uri: "http://localhost:80" + path,
          json: true,
          method: "POST",
          form: params
        }, reqCallback);
      }
  	}
  }
};
