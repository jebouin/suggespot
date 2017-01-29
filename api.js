//todo: add database error
//todo: generalize errors

const http = require("http");
const rq = require("request");
const urlut = require("url");
const logs = require("./logs");

module.exports = function(app, mysqlConnection) {

    function checkUserExists(id, res, callback) {
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
            query = "SELECT suggestions.id AS id, title, descr, upvotes, author, dir FROM suggestions LEFT JOIN votes ON suggestions.id = votes.suggestion AND user = ? ORDER BY upvotes DESC";
            params = [userID];
        } else {
            query = "SELECT id, title, descr, upvotes, author FROM suggestions ORDER BY upvotes DESC";
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
        var url = urlut.parse(req.originalUrl).pathname;
        var userID = req.query.id;
        var id = url.substr(url.search("/suggestion/") + 12);
        if(!(/^[a-zA-Z0-9/=]+$/.test(id))) {
            res.status(400);
            res.end("Invalid suggestion url");
            return;
        }
        id = parseInt(id, 36);
        mysqlConnection.query("SELECT id, title, descr, upvotes FROM suggestions WHERE id = ?", [id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("This suggestion doesn't exist");
                return;
            }
            var suggestionData = rows[0];
            function sendComments(voteDir) {
                var query, params;
                if(userID) {
                    query = "SELECT content, TIME(timeCreated) AS time, timeCreated AS t, users.name AS author, upvotes, comments.id AS id, votes.dir AS dir FROM comments INNER JOIN users ON comments.author = users.id AND suggestion = ? LEFT JOIN votes ON votes.comment = comments.id AND votes.user = ? ORDER BY t";
                    params = [suggestionData.id, userID];
                } else {
                    query = "SELECT content, TIME(timeCreated) AS time, timeCreated AS t, users.name AS author, upvotes, comments.id AS id FROM comments INNER JOIN users ON comments.author = users.id AND suggestion = ? ORDER BY t";
                    params = [suggestionData.id];
                }
                mysqlConnection.query(query, params, function(err, commentRows, fields) {
                    if(err) throw err;
                    for(var i = 0; i < commentRows.length; i++) {
                        commentRows[i].id = commentRows[i].id.toString(36);
                    }
                    res.json({title: suggestionData.title, descr: suggestionData.descr, sid: suggestionData.id.toString(36), upvotes: suggestionData.upvotes, comments: commentRows, voteDir: voteDir});
                });
            }

            if(userID) {
                mysqlConnection.query("SELECT dir FROM votes WHERE suggestion = ?", [id], function(err, voteRows, fields) {
                    if(voteRows.length != 1) {
                        sendComments();
                    } else {
                        sendComments(voteRows[0].dir);
                    }
                })
            } else {
                sendComments();
            }
        });
    });

    app.post("/api/vote", function(req, res) {
        if(!req.body.thingID) {
            res.status(400);
            res.end("No thing specified");
            return;
        }
        if(!req.body.userID) {
            res.status(400);
            res.end("No userID specified");
            return;
        }
        if(!req.body.dir) {
            res.status(400);
            res.end("No dir specified");
            return;
        }
        var thing = utils.getThingFromID(req.body.thingID);
        var userID = req.body.userID;
        var dir = req.body.dir;
        checkUserExists(userID, res, function(ok, row) {
            if(!ok) {
                return;
            }
            var username = row.name;
            if(thing.type === 0) {
                mysqlConnection.query('SELECT title FROM suggestions WHERE id = ?', [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404);
                        res.end("This suggestion doesn't exist");
                        return;
                    }
                    var suggestionTitle = rows[0].title;
                    if(dir == 0) {
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE suggestion = ? AND user = ?', [thing.id, userID], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400);
                                res.end("No vote to cancel");
                                return;
                            } else {
                                var wasUp = rows[0].dir === 1;
                                mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                    if(err) throw err;
                                    mysqlConnection.query('UPDATE suggestions SET upvotes = upvotes + ? WHERE id = ?', [wasUp ? -1 : 1, thing.id], function(err, rows, fields) {
                                        if(err) throw err;
                                        logs.log("user " + colors.bold(username) + " canceled his " + (wasUp ? "up" : "down") + "vote on " + colors.bold(suggestionTitle));
                                    });
                                });
                            }
                        });
                    } else {
                        var up = (dir == 1);
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE suggestion = ? AND user = ?', [thing.id, userID], function(err, rows, fields) {
                            if(err) throw err;
                            function registerVote() {
                                mysqlConnection.query('INSERT INTO votes (dir, user, suggestion) VALUES (?, ?, ?)', [dir, userID, thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                    logs.log("user " + colors.bold(username) + " " + (up ? "upvoted" : "downvoted") + " an entry " + colors.bold(suggestionTitle));
                                });
                            }
                            if(rows.length == 0) {
                                mysqlConnection.query('UPDATE suggestions SET upvotes = upvotes + ? WHERE id = ?', [up ? 1 : -1, thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                    registerVote();
                                });
                            } else {
                                var wasUp = rows[0].dir === 1;
                                if(up != wasUp) {
                                    mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                        if(err) throw err;
                                        mysqlConnection.query('UPDATE suggestions SET upvotes = upvotes + ? WHERE id = ?', [up ? 2 : -2, thing.id], function(err, rows, fields) {
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
            } else if(thing.type == 1) {
                mysqlConnection.query('SELECT author FROM comments WHERE id = ?', [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404);
                        res.end("This comment doesn't exist");
                        return;
                    }
                    var commentAuthor = rows[0].author;
                    if(dir == 0) {
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE comment = ? AND user = ?', [thing.id, userID], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400);
                                res.end("No vote to cancel");
                                return;
                            } else {
                                var wasUp = rows[0].dir === 1;
                                mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                    if(err) throw err;
                                    mysqlConnection.query('UPDATE comments SET upvotes = upvotes + ? WHERE id = ?', [wasUp ? -1 : 1, thing.id], function(err, rows, fields) {
                                        if(err) throw err;
                                    });
                                });
                            }
                        });
                    } else {
                        var up = (dir == 1);
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE comment = ? AND user = ?', [thing.id, userID], function(err, rows, fields) {
                            if(err) throw err;
                            function registerVote() {
                                mysqlConnection.query('INSERT INTO votes (dir, user, comment) VALUES (?, ?, ?)', [dir, userID, thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                });
                            }
                            if(rows.length == 0) {
                                mysqlConnection.query('UPDATE comments SET upvotes = upvotes + ? WHERE id = ?', [up ? 1 : -1, thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                    registerVote();
                                });
                            } else {
                                var wasUp = rows[0].dir === 1;
                                if(up != wasUp) {
                                    mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                        if(err) throw err;
                                        mysqlConnection.query('UPDATE comments SET upvotes = upvotes + ? WHERE id = ?', [up ? 2 : -2, thing.id], function(err, rows, fields) {
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
            }
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
        checkUserExists(req.body.userID, res, function(ok, row) {
            var username = row.name;
            mysqlConnection.query('SELECT id, title FROM suggestions WHERE id = ?', [id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404);
                    res.end("This suggestion doesn't exist");
                    return;
                }
                var suggestionData = rows[0];
                function sendComment(parent) {
                    var query, params;
                    if(parent) {
                        query = 'INSERT INTO comments (author, content, suggestion, parent) VALUES (?, ?, ?, ?)';
                        params = [req.body.userID, req.body.content, id, parent];
                    } else {
                        query = 'INSERT INTO comments (author, content, suggestion) VALUES (?, ?, ?)';
                        params = [req.body.userID, req.body.content, id];
                    }
                    mysqlConnection.query(query, params, function(err, rows, fields) {
                        if(err) throw err;
                        var cid = parseInt(rows.insertId);
                        res.status(201);
                        res.end(cid.toString(36));
                        logs.log("user " + colors.bold(username) + " commented on " + colors.bold(suggestionData.title));
                    });
                }
                if(req.body.parent) {
                    var parent = parseInt(req.body.parent, 36);
                    mysqlConnection.query('SELECT id FROM comments WHERE id = ?', [parent], function(err, rows, fields) {
                        if(err) throw err;
                        if(rows.length != 1) {
                            res.status(404);
                            res.end("This parent comment doesn't exist");
                            return;
                        }
                        sendComment(parent);
                    });
                } else {
                    sendComment();
                }
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
        checkUserExists(userID, res, function(ok, row) {
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
                var sid = parseInt(rows.insertId);
                logs.log("user " + colors.bold(username) + " posted a new entry " + colors.bold(title));
                res.status(201);
                res.end(sid.toString(36));
                return;
            });
        });
    })

    return {
        makeLocalAPICall: function(method, path, params, callback) {
            function reqCallback(err, res, body) {
                if(callback) {
                    if(res.statusCode >= 400 && res.statusCode < 500) {
                        callback(res.statusCode.toString(), null);
                    } else if(err) {
                        callback(err, null);
                    } else {
                        callback(null, body);
                    }
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
