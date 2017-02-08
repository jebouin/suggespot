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
        var userId = req.query.user;
        var query;
        var params;
        var confQuery = "(upvotes - SQRT(upvotes + downvotes)) / (upvotes + downvotes + 1) AS conf";
        if(userId) {
            query = "SELECT suggestions.id AS id, title, descr, upvotes - downvotes AS score, " + confQuery + ", author, dir FROM suggestions LEFT JOIN votes ON suggestions.id = votes.suggestion AND user = ? WHERE published = 1 ORDER BY conf DESC";
            params = [userId];
        } else {
            query = "SELECT id, title, descr, upvotes - downvotes AS score, " + confQuery + ", author FROM suggestions WHERE published = 1 ORDER BY conf DESC";
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

    app.get(/^\/api\/suggestion\//, function(req, res) {
        var url = urlut.parse(req.originalUrl).pathname;
        var userId = req.query.id;
        var id = url.substr(url.search("/suggestion/") + 12);
        if(!(/^[a-zA-Z0-9/=]+$/.test(id))) {
            res.status(400);
            res.end("Invalid suggestion url");
            return;
        }
        id = parseInt(id, 36);
        mysqlConnection.query("SELECT id, title, descr, author, upvotes - downvotes AS score, published FROM suggestions WHERE id = ?", [id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("This suggestion doesn't exist");
                return;
            }
            var suggestionData = rows[0];
            if(suggestionData.published == 0 && (!userId || userId != suggestionData.author)) {
                res.status(401);
                res.end("This suggestion is private and you are not the author");
                return;
            }
            function sendComments(voteDir) {
                var query, params;
                var confQuery = "(upvotes - SQRT(upvotes + downvotes)) / (upvotes + downvotes + 1) + (UNIX_TIMESTAMP(timeCreated) - 1465549200) / 604800 AS conf";
                var orderQuery = "ORDER BY IF(parent IS NULL, 0, 1), IF(parent IS NULL, conf, -timeCreated) DESC";
                if(userId) {
                    query = "SELECT content, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, upvotes - downvotes AS score, " + confQuery + ", comments.id AS id, votes.dir AS dir, parent FROM comments INNER JOIN users ON comments.author = users.id AND suggestion = ? LEFT JOIN votes ON votes.comment = comments.id AND votes.user = ? " + orderQuery;
                    params = [suggestionData.id, userId];
                } else {
                    query = "SELECT content, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, upvotes - downvotes AS score, " + confQuery + ", comments.id AS id, parent FROM comments INNER JOIN users ON comments.author = users.id AND suggestion = ? " + orderQuery;
                    params = [suggestionData.id];
                }
                mysqlConnection.query(query, params, function(err, commentRows, fields) {
                    if(err) throw err;
                    var comments = {}, formattedComments = [];
                    for(var i = 0; i < commentRows.length; i++) {
                        comments[commentRows[i].id] = commentRows[i];
                    }
                    for(var i = 0; i < commentRows.length; i++) {
                        comments[commentRows[i].id].children = [];
                        if(commentRows[i].parent) {
                            if(comments[commentRows[i].parent].parent) {
                                commentRows[i].parent = comments[commentRows[i].parent].parent;
                            }
                            comments[commentRows[i].parent].children.push(commentRows[i]);
                        }
                    }
                    for(var i = 0; i < commentRows.length; i++) {
                        if(!commentRows[i].parent) {
                            var c = comments[commentRows[i].id];
                            c.id = c.id.toString(36);
                            c.authorId = c.authorId.toString(36);
                            for(var j = 0; j < c.children.length; j++) {
                                c.children[j].id = c.children[j].id.toString(36);
                            }
                            formattedComments.push(c);
                        }
                    }
                    res.json({title: suggestionData.title, descr: suggestionData.descr, sid: suggestionData.id.toString(36), score: suggestionData.score, comments: formattedComments, voteDir: voteDir, published: suggestionData.published});
                });
            }

            if(userId) {
                mysqlConnection.query("SELECT dir FROM votes WHERE suggestion = ? AND user = ?", [id, userId], function(err, voteRows, fields) {
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
        if(!req.body.thingId) {
            res.status(400);
            res.end("No thing specified");
            return;
        }
        if(!req.body.userId) {
            res.status(400);
            res.end("No userId specified");
            return;
        }
        if(!req.body.dir) {
            res.status(400);
            res.end("No dir specified");
            return;
        }
        var thing = utils.getThingFromId(req.body.thingId);
        var userId = req.body.userId;
        checkUserExists(userId, res, function(ok, row) {
            if(!ok) {
                return;
            }
            var dir = req.body.dir;
            var dirField = utils.voteDirToField(dir);
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
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE suggestion = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400);
                                res.end("No vote to cancel");
                                return;
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                    if(err) throw err;
                                    mysqlConnection.query('UPDATE suggestions SET ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                        if(err) throw err;
                                        logs.log("user " + colors.bold(username) + " canceled his " + (prevDir == 1 ? "up" : "down") + "vote on " + colors.bold(suggestionTitle));
                                    });
                                });
                            }
                        });
                    } else {
                        var up = (dir == 1);
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE suggestion = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            function registerVote() {
                                mysqlConnection.query('INSERT INTO votes (dir, user, suggestion) VALUES (?, ?, ?)', [dir, userId, thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                    logs.log("user " + colors.bold(username) + " " + (up ? "upvoted" : "downvoted") + " an entry " + colors.bold(suggestionTitle));
                                });
                            }
                            if(rows.length == 0) {
                                mysqlConnection.query('UPDATE suggestions SET ' + dirField + ' = ' + dirField + ' + 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                    registerVote();
                                });
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                var wasUp = prevDir === 1;
                                if(up != wasUp) {
                                    mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                        if(err) throw err;
                                        mysqlConnection.query('UPDATE suggestions SET ' + dirField + ' = ' + dirField + ' + 1, ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
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
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE comment = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400);
                                res.end("No vote to cancel");
                                return;
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                    if(err) throw err;
                                    mysqlConnection.query('UPDATE comments SET ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                        if(err) throw err;
                                    });
                                });
                            }
                        });
                    } else {
                        var up = (dir == 1);
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE comment = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            function registerVote() {
                                mysqlConnection.query('INSERT INTO votes (dir, user, comment) VALUES (?, ?, ?)', [dir, userId, thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                });
                            }
                            if(rows.length == 0) {
                                mysqlConnection.query('UPDATE comments SET ' + dirField + ' = ' + dirField + ' + 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                    if(err) throw err;
                                    registerVote();
                                });
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                var wasUp = prevDir === 1;
                                if(up != wasUp) {
                                    mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                        if(err) throw err;
                                        mysqlConnection.query('UPDATE comments SET ' + dirField + ' = ' + dirField + ' + 1, ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
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
        if(!req.body.suggestionId) {
            res.status(400);
            res.end("No suggestion specified");
            return;
        }
        if(!req.body.userId) {
            res.status(400);
            res.end("No userId specified");
            return;
        }
        if(!req.body.content) {
            res.status(400);
            res.end("No comment specified");
            return;
        }
        var id = parseInt(req.body.suggestionId, 36);
        checkUserExists(req.body.userId, res, function(ok, row) {
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
                        params = [req.body.userId, req.body.content, id, parent];
                    } else {
                        query = 'INSERT INTO comments (author, content, suggestion) VALUES (?, ?, ?)';
                        params = [req.body.userId, req.body.content, id];
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
        var userId = req.body.userId;
        if(!req.body.userId) {
            res.status(400);
            res.end("No userId specified");
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
        checkUserExists(userId, res, function(ok, row) {
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
                params = [title, descr, lat, lon, userId];
            } else {
                query = 'INSERT INTO suggestions (title, descr, author) VALUES (?, ?, ?)';
                params = [title, descr, userId];
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
    });

    app.post("/api/publish", function(req, res) {
        if(!req.body.sid) {
            res.status(400);
            res.end("No suggestion specified");
            return;
        }
        if(!req.body.userId) {
            res.status(400);
            res.end("No userId specified");
            return;
        }
        var userId = parseInt(req.body.userId, 36);
        if(userId == NaN) {
            res.status(400);
            res.end("Incorrect userId");
            return;
        }
        var sid = parseInt(req.body.sid, 36);
        if(sid == NaN) {
            res.status(400);
            res.end("Incorrect suggestion id");
            return;
        }
        mysqlConnection.query("SELECT id, author FROM suggestions WHERE id = ?", [sid], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("This suggestion doesn't exist");
                return;
            }
            if(rows[0].author != userId) {
                res.status(401);
                res.end("This suggestion is private and you are not the author");
                return;
            }
            mysqlConnection.query("UPDATE suggestions SET published = 1 WHERE id = ?", [sid], function(err, rows, fields) {
                if(err) throw err;
                //check rows?
                res.status(200);
                res.end();
                return;
            });
        });
    });

    app.get("/api/profile", function(req, res) {
        if(!req.query.userId) {
            res.status(400);
            res.end("No userId specified");
            return;
        }
        var userId = parseInt(req.query.userId, 36);
        if(userId == NaN) {
            res.status(400);
            res.end("Incorrect userId");
            return;
        }
        mysqlConnection.query("SELECT id, name FROM users WHERE id = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("This user doesn't exist");
                return;
            }
            res.json(rows[0]);
        });
    });

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
