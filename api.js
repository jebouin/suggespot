const logs = require("./logs");
const http = require("http");
const rq = require("request");
const urlut = require("url");
const multer = require("multer");
const mime = require("mime-types");
const mmmagic = require("mmmagic");
const mmm = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE);
const async = require("async");

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        if(global.config.photoMimeTypes.indexOf(file.mimetype) < 0) {
            callback(new Error("this file type is not allowed"), null);
        } else {
            callback(null, __dirname + global.config.uploadDir);
        }
    }
});

var uploadPhoto = multer({
    storage: storage,
    limits: { fileSize: global.config.photoSizeLimit},
    onError: function(err, next) {
        next(err);
    }
}).single("photo");

module.exports = function(app, mysqlPool, auth) {
    var inTransaction = false;
    /*var originalBeginTransaction = mysqlConnection.beginTransaction;
    var originalCommit = mysqlConnection.commit;
    var originalRollback = mysqlConnection.rollback;

    mysqlConnection.beginTransaction = function(options, callback) {
        inTransaction = true;
        originalBeginTransaction.call(mysqlConnection, options, callback);
    };

    mysqlConnection.commit = function(options, callback) {
        inTransaction = false;
        originalCommit.call(mysqlConnection, options, callback);
    };

    mysqlConnection.rollback = function(options, callback) {
        inTransaction = false;
        originalRollback.call(mysqlConnection, options, callback);
    };*/
    //todo

    function getTransactingConnection(callback) {
        mysqlPool.getConnection(function(err, connection) {
            if(err) {
                callback(err);
            }
            connection.beginTransaction(function(err) {
                if(err) {
                    callback(err);
                }
                callback(null, connection);
            });
        });
    }

    function testTransactionError(connection, err, beforeCallback) {
        if(err) {
            connection.rollback();
            if(beforeCallback) {
                beforeCallback();
            }
            throw err;
        }
    }

    function createNewEntity(connection, callback) {
        /*if(!inTransaction) {
            callback(new Error("Not in transaction"), null);
            return;
        }*/
        connection.query("INSERT INTO entities () VALUES ()", function(err, rows, fields) {
            if(err) callback(err);
            testTransactionError(connection, err);
            callback(null, rows.insertId);
        });
    }

    function checkUserExists(id, res, callback) {
        mysqlPool.query("SELECT name FROM users WHERE id = ?", [id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this user doesn't exist");
                return;
            }
            callback(true, rows[0]);
        });
    }

    function sendNotification(connection, notificationId, userId, callback) {
        if(userId === null || userId === "null") {
            callback(new Error("userId is null"));
            return;
        }
        /*if(!inTransaction) {
            callback(new Error("not in transaction"));
            return;
        }*/ //todo?
        connection.query("INSERT INTO userNotifications (user, notification) VALUES (?, ?)", [userId, notificationId], function(err, rows, fields) {
            testTransactionError(connection, err);
            callback(null);
        });
    }

    function parseCoordinates(object) {
        var location = object.lat && object.lon, lat, lon;
        if(location) {
            lat = parseFloat(object.lat);
            lon = parseFloat(object.lon);
            if(isNaN(lat) || isNaN(lon)) {
                throw new Error("invalid coordinates");
            }
        } else {
            return null;
        }
        return {lat: lat, lon: lon};
    }

    app.use("/api/*", function(req, res, next) {
        if(req.ip === "::ffff:127.0.0.1" || req.ip === "127.0.0.1" || req.ip === "::1") {
            next();
        } else {
            console.log(req.ip);
            res.status(401).end();
        }
    });

    var queries = {
        score: "CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score",
        distance: "12742000 * ASIN(SQRT(POW(SIN(RADIANS(lat / 10000000 - ?) / 2), 2) + COS(RADIANS(lat / 10000000)) * COS(RADIANS(?)) * POW(SIN(RADIANS(lon / 10000000 - ?) / 2), 2)))"
    };

    app.get(["/api/suggestions/:mode", "/api/suggestions/"], function(req, res) {
        var mode = req.params.mode;
        if(!mode) {
            mode = "all";
        }
        var start = parseInt(req.query.start) || 0;
        var limit = parseInt(req.query.limit) || 10;
        if(limit > 50) limit = 50;
        try {
            var userId = req.query.userId;
            if(userId) {
                userId = parseInt(userId, 36);
                if(isNaN(userId)) {
                    throw new Error("invalid userId");
                }
            }
            var authorId = req.query.authorId;
            if(authorId) {
                authorId = parseInt(authorId, 36);
                if(isNaN(authorId)) {
                    throw new Error("invalid authorId");
                }
            }
            var tagName = req.query.tagName;
            var location = parseCoordinates(req.query);
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }

        var selectParams = [];
        var subqueryParams = [];
        var joinParams = [];
        var whereParams = [];
        var confQuery = "(upvotes + 1) / (upvotes + downvotes + 1) - 1 / SQRT(upvotes + downvotes + 1) AS conf";
        var descrQuery = "IF(LENGTH(descr) > 256, CONCAT(SUBSTRING(descr, 1, 256), '...'), descr) AS descr";
        var voteJoin = "LEFT JOIN votes ON suggestions.entityId = votes.entity AND user = ?";
        var photoJoin = "LEFT JOIN photos ON photos.suggestion = suggestions.entityId AND position = 0";
        var selectQuery = "SELECT";
        var fromQuery = "FROM suggestions";
        var whereQuery = "WHERE published = 1";
        var havingQuery = "";
        var orderByQuery = "ORDER BY conf DESC";
        try {
            if(mode == "all") {
                selectQuery += " suggestions.entityId AS id, title, published, timeCreated, timeUpdated, author, " + descrQuery + ", " + queries.score + ", " + confQuery + ", path AS thumb";
                if(userId) {
                    selectQuery += ", dir";
                    fromQuery += " " + voteJoin;
                    joinParams.push(userId);
                }
            } else if(mode == "interests") {
                if(userId) {
                    var interestSubquery = "(SELECT";
                    if(location) {
                        interestSubquery += " lat, lon, ";
                    }
                    interestSubquery += " suggestions.entityId, title, published, timeCreated, timeUpdated, author, " + descrQuery + ", " + queries.score + ", " + confQuery + " FROM suggestions INNER JOIN suggestionTags ON suggestions.entityId = suggestionTags.suggestion INNER JOIN userTags ON userTags.tag = suggestionTags.tag AND userTags.user = ? GROUP BY suggestions.entityId) AS suggestions";
                    selectQuery += " suggestions.entityId AS id, title, published, timeCreated, timeUpdated, descr, score, conf, author, dir, path AS thumb ";
                    subqueryParams.push(userId);
                    fromQuery = "FROM " + interestSubquery + " " + voteJoin;
                    joinParams.push(userId);
                } else {
                    throw new Error("you need to be logged in to see your interests");
                }
            } else if(mode == "tag") {
                selectQuery += " suggestions.entityId AS id, title, published, timeCreated, timeUpdated, author, " + descrQuery + ", " + queries.score + ", " + confQuery + ", path AS thumb";
                if(userId) {
                    selectQuery += ", dir";
                    fromQuery += " " + voteJoin;
                    joinParams.push(userId);
                }
                fromQuery += " " + "INNER JOIN suggestionTags ON suggestions.entityId = suggestionTags.suggestion INNER JOIN tags ON suggestionTags.tag = tags.id AND tags.name = ?";
                joinParams.push(tagName);
            } else if(mode == "profile") {
                if(!authorId) {
                    throw new Error("please specify a valid authorId");
                }
                selectQuery += " suggestions.entityId AS id, title, published, timeCreated, timeUpdated, author, " + descrQuery + ", " + queries.score + ", " + confQuery + ", path AS thumb";
                if(userId) {
                    selectQuery += ", dir";
                    fromQuery += " " + voteJoin;
                    joinParams.push(userId);
                }
                if(userId && userId == authorId) {
                    whereQuery = "WHERE author = ?";
                } else {
                    whereQuery += " AND author = ?";
                }
                whereParams.push(authorId);
                orderByQuery = "ORDER BY published ASC, timeCreated DESC";
            } else {
                throw new Error("invalid mode");
            }
            if(location) {
                selectQuery += ", " + queries.distance + " AS dist ";
                havingQuery = "HAVING dist < 51000";
                selectParams.push(location.lat);
                selectParams.push(location.lat);
                selectParams.push(location.lon);
            }
        } catch(e) {
            console.log(e.message);
        }

        var query = selectQuery + " " + fromQuery + " " + photoJoin + " " + whereQuery + " " + havingQuery + " " + orderByQuery + " LIMIT ?, ?";
        var params = selectParams.concat(subqueryParams).concat(joinParams).concat(whereParams);
        params.push(start);
        params.push(limit);
        //console.log(query, params);
        mysqlPool.query(query, params, function(err, rows, fields) {
            if(err) throw err;
            for(var i=0; i<rows.length; i++) {
                rows[i].id = rows[i].id.toString(36);
                rows[i].href = "/s/" + rows[i].id;
            }
            if(tagName) {
                res.status(200).json({suggestions: rows, tag: tagName});
            } else {
                res.status(200).json({suggestions: rows});
            }
            if(userId && location) {
                mysqlPool.query("UPDATE users SET lastLat = ?, lastLon = ? WHERE id = ?", [location.lat * 10000000, location.lon * 10000000, userId], function(err, rows, fields) {
                    if(err) throw err;
                });
            }
        });
    });

    app.get("/api/suggestion/:id", function(req, res) {
        var userId = req.query.id;
        if(userId) {
            userId = parseInt(userId, 36);
        }
        var id = req.params.id;
        if(!(/^[a-zA-Z0-9/=]+$/.test(id))) {
            res.status(400).end("invalid suggestion url");
            return;
        }
        id = parseInt(id, 36);
        var selectQuery = "SELECT suggestions.entityId AS id, title, timeCreated, timeUpdated, descr, author, users.name AS authorName, " + queries.score + ", published";
        var params = [];
        var location = parseCoordinates(req.query);
        if(location) {
            selectQuery += ", " + queries.distance + " AS dist";
            params = params.concat([location.lat, location.lat, location.lon]);
        }
        var query = selectQuery + " FROM suggestions LEFT JOIN users ON suggestions.author = users.id WHERE suggestions.entityId = ?";
        params.push(id);
        mysqlPool.query(query, params, function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this suggestion doesn't exist");
                return;
            }
            var suggestionData = rows[0];
            if(suggestionData.published === 0 && (!userId || userId != suggestionData.author)) {
                res.status(403).end("this suggestion is private and you are not the author");
                return;
            }

            function sendResponse(photos, voteDir) {
                var author = suggestionData.author;
                if(author) {
                    author = author.toString(36);
                }
                //get tags and send response with everything
                mysqlPool.query("SELECT tags.id AS tid, tags.name AS name FROM suggestionTags LEFT JOIN tags ON tags.id = tag WHERE suggestion = ?", [suggestionData.id], function(err, tagRows, fields) {
                    if(err) throw err;
                    res.status(200).json({title: suggestionData.title,
                              descr: suggestionData.descr,
                              author: author,
                              authorName: suggestionData.authorName,
                              sid: suggestionData.id.toString(36),
                              score: suggestionData.score,
                              tags: tagRows,
                              photos: photos,
                              voteDir: voteDir,
                              maximumPhotos: global.config.maximumPhotos,
                              timeCreated: suggestionData.timeCreated,
                              timeUpdated: suggestionData.timeUpdated,
                              published: suggestionData.published});
                });
            }

            //get the photos
            mysqlPool.query("SELECT id, path FROM photos WHERE suggestion = ? ORDER BY position", [suggestionData.id], function(err, photoRows, fields) {
                if(err) throw err;
                for(var i = 0; i < photoRows.length; i++) {
                    photoRows[i].id = photoRows[i].id.toString(36);
                }
                if(userId) {
                    mysqlPool.query("SELECT dir FROM votes WHERE entity = ? AND user = ?", [id, userId], function(err, voteRows, fields) {
                        if(err) throw err;
                        if(voteRows.length != 1) {
                            sendResponse(photoRows);
                        } else {
                            sendResponse(photoRows, voteRows[0].dir);
                        }
                    });
                } else {
                    sendResponse(photoRows);
                }
            });
        });
    });

    app.post("/api/suggestion/:id/distance", function(req, res) {
        try {
            var id = req.params.id;
            if(!(/^[a-zA-Z0-9/=]+$/.test(id))) {
                throw new Error("invalid suggestion url");
            }
            id = parseInt(id, 36);
            if(isNaN(id)) {
                throw new Error("invalid suggestion url");
            }
            var location = parseCoordinates(req.body);
            if(!location) {
                throw new Error("no coordinates specified");
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("SELECT entityId AS id, " + queries.distance + " AS dist FROM suggestions WHERE entityId = ?", [location.lat, location.lat, location.lon, id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this suggestion doesn't exist");
                return;
            }
            res.status(200).json({distance: rows[0].dist});
        });
    });

    app.post("/api/vote", function(req, res) {
        try {
            var thingId = utils.checkParam(req.body, "thingId");
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var dir = utils.checkParam(req.body, "dir");
            var thing = utils.getThingFromId(req.body.thingId);
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        checkUserExists(userId, res, function(ok, row) {
            var dirField = utils.voteDirToField(dir);
            var username = row.name;
            if(thing.type === 0) {
                mysqlPool.query("SELECT title FROM suggestions WHERE entityId = ?", [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404).end("this suggestion doesn't exist");
                        return;
                    }
                    var suggestionTitle = rows[0].title;
                    if(dir === 0) {
                        mysqlPool.query("SELECT id, dir FROM votes WHERE entity = ? AND user = ?", [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400).end("no vote to cancel");
                                return;
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                getTransactingConnection(function(err, connection) {
                                    if(err) throw err;
                                    connection.query("DELETE FROM votes WHERE id = ?", [rows[0].id], function(err, rows, fields) {
                                        testTransactionError(connection, err);
                                        connection.query("UPDATE suggestions SET " + prevDirField + " = " + prevDirField + " - 1 WHERE entityId = ?", [thing.id], function(err, rows, fields) {
                                            testTransactionError(connection, err);
                                            connection.commit(function(err) {
                                                testTransactionError(connection, err);
                                                connection.release();
                                                logs.log("user " + colors.bold(username) + " canceled his " + (prevDir == 1 ? "up" : "down") + "vote on " + colors.bold(suggestionTitle));
                                            });
                                        });
                                    });
                                });
                            }
                        });
                    } else {
                        var up = (dir == 1);
                        mysqlPool.query('SELECT id, dir FROM votes WHERE entity = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            function registerVote(connection) {
                                connection.query('INSERT INTO votes (dir, user, entity) VALUES (?, ?, ?)', [dir, userId, thing.id], function(err, rows, fields) {
                                    testTransactionError(connection, err);
                                    connection.commit(function(err) {
                                        testTransactionError(connection, err);
                                        connection.release();
                                        logs.log("user " + colors.bold(username) + " " + (up ? "upvoted" : "downvoted") + " an entry " + colors.bold(suggestionTitle));
                                    });
                                });
                            }
                            getTransactingConnection(function(err, connection) {
                                if(err) throw err;
                                if(rows.length === 0) {
                                    connection.query('UPDATE suggestions SET ' + dirField + ' = ' + dirField + ' + 1 WHERE entityId = ?', [thing.id], function(err, rows, fields) {
                                        testTransactionError(connection, err);
                                        registerVote(connection);
                                    });
                                } else {
                                    var prevDir = rows[0].dir;
                                    var prevDirField = utils.voteDirToField(prevDir);
                                    var wasUp = prevDir === 1;
                                    if(up != wasUp) {
                                        connection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                            testTransactionError(connection, err);
                                            connection.query('UPDATE suggestions SET ' + dirField + ' = ' + dirField + ' + 1, ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE entityId = ?', [thing.id], function(err, rows, fields) {
                                                testTransactionError(err);
                                                registerVote(connection);
                                            });
                                        });
                                    }
                                }
                            });
                        });
                    }
                    res.status(200).end();
                    return;
                });
            } else if(thing.type == 1) {
                mysqlPool.query('SELECT author FROM comments WHERE entityId = ?', [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404).end("this comment doesn't exist");
                        return;
                    }
                    var commentAuthor = rows[0].author;
                    if(dir === 0) {
                        mysqlPool.query('SELECT id, dir FROM votes WHERE entity = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400).end("no vote to cancel");
                                return;
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                var connection = getTransactingConnection(function(err, connection) {
                                    if(err) throw err;
                                    connection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                        testTransactionError(connection, err);
                                        connection.query('UPDATE comments SET ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE entity = ?', [thing.id], function(err, rows, fields) {
                                            testTransactionError(connection, err);
                                            connection.commit(function(err) {
                                                testTransactionError(connection, err);
                                                connection.release();
                                            });
                                        });
                                    });
                                });
                            }
                        });
                    } else {
                        var up = (dir == 1);
                        mysqlPool.query('SELECT id, dir FROM votes WHERE entity = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            function registerVote(connection) {
                                connection.query('INSERT INTO votes (dir, user, entity) VALUES (?, ?, ?)', [dir, userId, thing.id], function(err, rows, fields) {
                                    testTransactionError(connection, err);
                                    connection.commit(function(err) {
                                        testTransactionError(connection, err);
                                        connection.release();
                                    });
                                });
                            }
                            getTransactingConnection(function(err, connection) {
                                if(err) throw err;
                                if(rows.length === 0) {
                                    connection.query('UPDATE comments SET ' + dirField + ' = ' + dirField + ' + 1 WHERE entityId = ?', [thing.id], function(err, rows, fields) {
                                        testTransactionError(connection, err);
                                        registerVote(connection);
                                    });
                                } else {
                                    var prevDir = rows[0].dir;
                                    var prevDirField = utils.voteDirToField(prevDir);
                                    var wasUp = prevDir === 1;
                                    if(up != wasUp) {
                                        connection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                            testTransactionError(connection, err);
                                            connection.query('UPDATE comments SET ' + dirField + ' = ' + dirField + ' + 1, ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE entityId = ?', [thing.id], function(err, rows, fields) {
                                                testTransactionError(connection, err);
                                                registerVote(connection);
                                            });
                                        });
                                    }
                                }
                            });
                        });
                    }
                    res.status(200).end();
                    return;
                });
            } else {
                res.status(400).end("incorrect thing type");
                return;
            }
        });
    });

    app.get(["/api/threads", "/api/threads/:id"], function(req, res) {
        var start = parseInt(req.query.start) || 0;
        var limit = parseInt(req.query.limit) || 20;
        if(limit > 50) limit = 50;
        try {
            var userId = req.query.userId;
            if(userId) {
                userId = parseInt(userId, 36);
                if(isNaN(userId)) {
                    throw new Error("invalid userId");
                }
            }
            var sid = req.query.sid;
            var cid = req.query.cid;
            var id = req.query.id;
            if(!sid && !cid && !id) {
                throw new Error("please specify at least a sid, cid or id");
            }
            var excludedThread = req.query.excludedThread;
            if(excludedThread) {
                excludedThread = parseInt(excludedThread, 36);
                if(isNaN(excludedThread)) {
                    throw new Error("invalid excludedThread");
                }
            }
            if(sid) {
                sid = parseInt(sid, 36);
                if(isNaN(sid)) {
                    throw new Error("invalid sid");
                }
            }
            if(cid) {
                if(excludedThread) {
                    throw new Error("can't have excludedThread and cid parameters");
                }
                cid = parseInt(cid, 36);
                if(isNaN(cid)) {
                    throw new Error("invalid cid");
                }
            } else if(id) {
                if(excludedThread) {
                    throw new Error("can't have excludedThread and id parameters");
                }
                id = parseInt(id, 36);
                if(isNaNi(id)) {
                    throw new Error("invalid id");
                }
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("SELECT entityId AS id FROM suggestions WHERE entityId = ?", [sid], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length < 1) {
                res.status(404).end("this suggestion doesn't exist");
                return;
            }
            if(cid) {
                mysqlPool.query("SELECT thread FROM comments WHERE entityId = ?", [cid], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length < 1) {
                        res.status(404).end("this comment doesn't exist");
                        return;
                    }
                    id = rows[0].thread;
                    sendComments();
                });
            } else {
                sendComments();
            }
        });
        function sendComments() {
            var query, params;
            var confQuery = "(upvotes + 1) / (upvotes + downvotes + 1) - 1 / SQRT(upvotes + downvotes + 1) + (UNIX_TIMESTAMP(timeCreated) - 1465549200) / 1209600 AS conf";
            var orderQuery = "ORDER BY isReply, IF(isReply, -timeCreated, conf) DESC;";
            var subQuery;
            if(id) {
                subQuery = "(SELECT id, suggestion FROM commentThreads WHERE id = ?) AS threads";
                params = [id];
            } else if(excludedThread) {
                subQuery = "(SELECT id, suggestion FROM commentThreads WHERE suggestion = ? AND id != ? LIMIT ?, ?) AS threads";
                params = [sid, excludedThread, start, limit];
            } else {
                subQuery = "(SELECT id, suggestion FROM commentThreads WHERE suggestion = ? LIMIT ?, ?) AS threads";
                params = [sid, start, limit];
            }
            if(userId) {
                query = "SELECT comments.entityId AS id, isReply, content, thread, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, votes.dir AS dir, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, " + confQuery + " FROM " + subQuery + " INNER JOIN comments ON threads.id = comments.thread LEFT JOIN users ON comments.author = users.id LEFT JOIN votes ON comments.entityId = votes.entity AND votes.user = ? " + orderQuery;
                params.push(userId);
            } else {
                query = "SELECT comments.entityId AS id, isReply, content, thread, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, " + confQuery + " FROM " + subQuery + " INNER JOIN comments ON threads.id = comments.thread LEFT JOIN users ON comments.author = users.id " + orderQuery;
            }
            mysqlPool.query(query, params, function(err, commentRows, fields) {
                if(err) throw err;
                var formattedComments = {};
                var result = [];
                for(var i = 0; i < commentRows.length; i++) {
                    if(commentRows[i].isReply && formattedComments[commentRows[i].thread]) {
                        formattedComments[commentRows[i].thread].children.push(commentRows[i]);
                    } else {
                        commentRows[i].children = [];
                        formattedComments[commentRows[i].thread] = commentRows[i];
                    }
                }
                for(i = 0; i < commentRows.length; i++) {
                    if(!commentRows[i].isReply && formattedComments[commentRows[i].thread]) {
                        result.push(formattedComments[commentRows[i].thread]);
                    }
                }
                function convertBase36(comment) {
                    comment.id = comment.id.toString(36);
                    comment.thread = comment.thread.toString(36);
                    comment.authorId = comment.authorId.toString(36);
                }
                result.forEach(function(comment) {
                    convertBase36(comment);
                    comment.children.forEach(function(child) {
                        convertBase36(child);
                    });
                });
                res.status(200).json(result);
            });
        }
    });

    app.get("/api/comments/:id", function(req, res) {
        var userId = req.query.userId;
        if(userId) {
            userId = parseInt(userId, 36);
        }
        try {
            var commentId = utils.checkParam(req.params, "id");
            commentId = parseInt(commentId, 36);
            if(isNaN(commentId)) {
                throw new Error("invalid commentId");
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var query, params;
        if(userId) {
            query = "SELECT comments.entityId AS id, content, thread, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, votes.dir AS dir, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score FROM comments LEFT JOIN users ON comments.author = users.id LEFT JOIN votes ON comments.entityId = votes.entity AND votes.user = ? WHERE comments.entityId = ?";
            params = [userId, commentId];
        } else {
            query = "SELECT comments.entityId AS id, content, thread, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score FROM comments LEFT JOIN users ON comments.author = users.id WHERE comments.entityId = ?";
            params = [commentId];
        }
        mysqlPool.query(query, params, function(err, rows, fields) {
            if(err) throw err;
            if(rows.length == 1) {
                var comment = rows[0];
                comment.id = comment.id.toString(36);
                comment.authorId = comment.authorId.toString(36);
                comment.thread = comment.thread.toString(36);
                res.status(200).json(comment);
            } else {
                res.status(404).end();
            }
        });
    });

    app.post("/api/comment", function (req, res) {
        try {
            var suggestionId = utils.checkParam(req.body, "suggestionId");
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var content = utils.checkParam(req.body, "content");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var id = parseInt(suggestionId, 36);
        checkUserExists(userId, res, function(ok, row) {
            var username = row.name;
            mysqlPool.query("SELECT entityId AS id, title, author FROM suggestions WHERE entityId = ?", [id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404).end("this suggestion doesn't exist");
                    return;
                }
                var suggestionData = rows[0];
                function sendComment(thread) {
                    var isReply = typeof(thread) !== "undefined";
                    function insertComment(connection) {
                        createNewEntity(connection, function(err, entityId) {
                            testTransactionError(connection, err);
                            connection.query("INSERT INTO comments (entityId, author, content, thread, isReply) VALUES (?, ?, ?, ?, ?)", [entityId, userId, content, thread, isReply], function(err, rows, fields) {
                                testTransactionError(connection, err);
                                connection.commit(function(err) {
                                    testTransactionError(connection, err);
                                    connection.release();
                                    onInsertedComment(entityId);
                                });
                            });
                        });
                    }
                    getTransactingConnection(function(err, connection) {
                        if(err) throw err;
                        if(thread) {
                            insertComment(connection);
                        } else {
                            connection.query("INSERT INTO commentThreads (suggestion) VALUES (?)", [id], function(err, rows, fields) {
                                testTransactionError(connection, err);
                                thread = rows.insertId;
                                insertComment(connection);
                            });
                        }
                    });
                    function onInsertedComment(cid) {
                        res.status(201).end(cid.toString(36));
                        logs.log("user " + colors.bold(username) + " commented on " + colors.bold(suggestionData.title));
                        var expr = /(^|\s)@([a-zA-Z0-9_]+)/g;
                        var match;
                        var checkUserFunctions = [];
                        var mentionned = [];
                        var mentionnedAuthor = false;
                        do {
                            match = expr.exec(content);
                            if(match) {
                                if(mentionned.indexOf(match[2]) == -1) {
                                    mentionned.push(match[2]);
                                }
                            }
                        } while(match);
                        mentionned = utils.removeDuplicates(mentionned);
                        mentionned.forEach(function(m) {
                            if(!m) return;
                            checkUserFunctions.push(function(callback) {
                                mysqlPool.query("SELECT id FROM users WHERE name = ?", [m], function(err, rows, fields) {
                                    if(err) {
                                        callback(err);
                                        return;
                                    }
                                    if(rows.length != 1) {
                                        callback();
                                        return;
                                    }
                                    if(rows[0].id == suggestionData.author) {
                                        mentionnedAuthor = true;
                                    }
                                    callback(null, rows[0].id);
                                });
                            });
                        });
                        async.series(checkUserFunctions, function(err, users) {
                            if(err) throw err;
                            users = users.filter(function(user) {
                                return (user !== undefined && user !== null && user !== "" && user !== userId);
                            });
                            function sendMentionNotifications(connection) {
                                if(users.length > 0) {
                                    getTransactingConnection(function(err, connection) {
                                        if(err) throw err;
                                        connection.query("INSERT INTO notifications (entity, author, action) VALUES (?, ?, 'mention')", [cid, userId], function(err, rows, fields) {
                                            testTransactionError(connection, err);
                                            var toSend = users.length;
                                            users.forEach(function(user) {
                                                sendNotification(connection, rows.insertId, user, function(err) {
                                                    testTransactionError(connection, err);
                                                    toSend--;
                                                    if(toSend === 0) {
                                                        connection.commit(function(err) {
                                                            testTransactionError(connection, err);
                                                            connection.release();
                                                        });
                                                        return;
                                                    }
                                                });
                                            });
                                        });

                                    });
                                }
                            }
                            if(userId === null || userId === "null" || suggestionData.author === null || suggestionData.author === "null") {

                            } else if(mentionnedAuthor || suggestionData.author == userId) {
                                sendMentionNotifications();
                            } else {
                                getTransactingConnection(function(err, connection) {
                                    if(err) throw err;
                                    connection.query("INSERT INTO notifications (entity, author, action) VALUES (?, ?, 'comment')", [cid, userId], function(err, rows, fields) {
                                        testTransactionError(connection, err);
                                        sendNotification(connection, rows.insertId, suggestionData.author, function(err) {
                                            testTransactionError(connection, err);
                                            connection.commit(function(err) {
                                                testTransactionError(connection, err);
                                                connection.release();
                                                sendMentionNotifications();
                                            });
                                        });
                                    });
                                });
                            }
                        });
                    }
                }
                if(req.body.thread) {
                    sendComment(parseInt(req.body.thread, 36));
                } else {
                    sendComment();
                }
            });
        });
    });

    app.post("/api/submit", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var title = utils.checkParam(req.body, "title");
            var descr = utils.checkParam(req.body, "descr");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        checkUserExists(userId, res, function(ok, row) {
            var username = row.name;
            var lat = req.body.lat;
            var lon = req.body.lon;
            function removeSpecialChars(str) {
                str = str.replace('\n', '');
                str = str.replace('\r', '');
            }
            removeSpecialChars(title);
            removeSpecialChars(descr);
            var query, params;
            if(lat !== null && lon !== null) {
                lat *= 10000000;
                lon *= 10000000;
                query = 'INSERT INTO suggestions (title, descr, lat, lon, author, entityId) VALUES (?, ?, ?, ?, ?, ?)';
                params = [title, descr, lat, lon, userId];
            } else {
                query = 'INSERT INTO suggestions (title, descr, author, entityId) VALUES (?, ?, ?, ?)';
                params = [title, descr, userId];
            }
            getTransactingConnection(function(err, connection) {
                if(err) throw err;
                createNewEntity(connection, function(err, entityId) {
                    testTransactionError(connection, err);
                    params.push(entityId);
                    connection.query(query, params, function(err, rows, fields) {
                        testTransactionError(connection, err);
                        connection.commit(function(err) {
                            testTransactionError(connection, err);
                            var sid = parseInt(entityId);
                            logs.log("user " + colors.bold(username) + " posted a new entry " + colors.bold(title));
                            res.status(201).end(sid.toString(36));
                            connection.release();
                        });
                    });
                });
            });
        });
    });

    app.post("/api/edit", function(req, res) {
        try {
            var user = utils.checkParam(req.body, "user");
            user.id = parseInt(user.id, 36);
            var edit = utils.checkParam(req.body, "edit");
            var thingId = utils.checkParam(edit, "thingId");
            var thing = utils.getThingFromId(thingId);
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        function editSuggestion(suggestion) {
            var edited = false;
            function onEditFinished() {
                res.status(200).end();
                logs.log("user " + colors.bold(user.name) + " edited their suggestion " + colors.bold(suggestion.title));
            }
            function onInvalidEdit() {
                res.status(400).end("invalid edit reqest");
            }
            function editPhotoOrder(callback) {
                edited = true;
                var order = edit.photosOrder;
                getTransactingConnection(function(err, connection) {
                    if(err) throw err;
                    var queryFunctions = [];
                    Array.prototype.forEach.call(order, function(photoId, i) {
                        queryFunctions.push(function(callback) {
                            connection.query("UPDATE photos SET position = ? WHERE id = ?", [i, parseInt(photoId, 36)], function(err, rows, fields) {
                                testTransactionError(connection, err);
                                callback();
                            });
                        });
                    });
                    async.parallel(queryFunctions, function(err, results) {
                        if(err) {
                            callback(true);
                            return;
                        }
                        connection.commit(function(err) {
                            testTransactionError(connection, err);
                            connection.release();
                            callback();
                        });
                    });
                });
            }
            function editDescription(callback) {
                edited = true;
                mysqlPool.query("UPDATE suggestions SET descr = ? WHERE entityId = ?", [edit.descr, thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    callback();
                });
            }
            function editTagsAdded(callback) {
                edited = true;
                var tags = edit.tagsAdded;
                getTransactingConnection(function(err, connection) {
                    if(err) throw err;
                    var queryFunctions = [];
                    Array.prototype.forEach.call(tags, function(tag) {
                        if(tag.tid) {
                            queryFunctions.push(function(callback) {
                                connection.query("INSERT INTO suggestionTags (suggestion, tag) VALUES (?, ?)", [thing.id, tag.tid], function(err, rows, fields) {
                                    testTransactionError(connection, err);
                                    callback();
                                });
                            });
                        } else if(tag.name) {
                            tag.name = tag.name.replace(/\w\S*/g, function(t) {
                                return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
                            });
                            queryFunctions.push(function(callback) {
                                connection.query("INSERT INTO tags (name) VALUES (?)", [tag.name], function(err, rows, fields) {
                                    //if duplicate, don't throw error
                                    if(err) {
                                        if(err.code == "ER_DUP_ENTRY") {
                                            connection.query("INSERT INTO suggestionTags (suggestion, tag) VALUES (?, (SELECT id FROM tags WHERE name = ?))", [suggestion.id, tag.name], function(err, rows, fields) {
                                                testTransactionError(connection, err);
                                                callback();
                                            });
                                        } else {
                                            testTransactionError(connection, err);
                                        }
                                    } else {
                                        connection.query("INSERT INTO suggestionTags (suggestion, tag) VALUES (?, ?)", [thing.id, rows.insertId], function(err, rows, fields) {
                                            testTransactionError(connection, err);
                                            logs.log("user " + colors.bold(user.name) + " created a new tag " + colors.bold(tag.name));
                                            callback();
                                        });
                                    }
                                });
                            });
                        }
                    });
                    async.parallel(queryFunctions, function(err, results) {
                        if(err) {
                            callback(true);
                            return;
                        }
                        connection.commit(function(err) {
                            testTransactionError(connection, err);
                            connection.release();
                            callback();
                        });
                    });

                });
            }
            function editTagsRemoved(callback) {
                edited = true;
                var tags = edit.tagsRemoved;
                getTransactingConnection(function(err, connection) {
                    if(err) throw err;
                    var queryFunctions = [];
                    Array.prototype.forEach.call(tags, function(tag) {
                        if(!tag.tid) return;
                        queryFunctions.push(function(callback) {
                            connection.query("DELETE FROM suggestionTags WHERE (suggestion, tag) = (?, ?)", [thing.id, tag.tid], function(err, rows, fields) {
                                testTransactionError(connection, err);
                                callback();
                            });
                        });
                    });
                    async.parallel(queryFunctions, function(err, results) {
                        if(err) {
                            callback(true);
                            return;
                        }
                        connection.commit(function(err) {
                            testTransactionError(err);
                            connection.release();
                            callback();
                        });
                    });
                });
            }
            var fa = [];
            if(edit.photosOrder && edit.photosOrder.length > 0) fa.push(editPhotoOrder);
            if(edit.tagsAdded && edit.tagsAdded.length > 0) fa.push(editTagsAdded);
            if(edit.tagsRemoved && edit.tagsRemoved.length > 0) fa.push(editTagsRemoved);
            if(edit.descr) fa.push(editDescription);
            async.parallel(fa, function(err, results) {
                if(!edited) {
                    onInvalidEdit();
                    return;
                } else if(err) {
                    res.status(500).end();
                    return;
                }
                onEditFinished();
            });
        }
        function editComment(comment) {
            try {
                var commentContent = utils.checkParam(edit, "content");
            } catch(e) {
                res.status(400).end("no comment content provided");
                return;
            }
            mysqlPool.query("UPDATE comments SET content = ? WHERE entityId = ?", [commentContent, comment.entityId], function(err, rows, fields) {
                if(err) throw err;
                res.status(200).end();
            });
        }
        if(thing.type === 0 || thing.type === 1) {
            var thingName = utils.thingTypeToString(thing.type);
            var tableName = thingName + "s";
            var selectQuery = "SELECT entityId, author";
            var onCanEdit = thing.type === 0 ? editSuggestion : editComment;
            if(thing.type === 0) {
                selectQuery += ", title";
            }
            mysqlPool.query(selectQuery + " FROM " + tableName + " WHERE entityId = ?", [thing.id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404).end("this " + thingName + " doesn't exist");
                    return;
                }
                var row = rows[0];
                if(row.author != user.id) {
                    res.status(401).end("this " + thingName + " is not yours");
                    return;
                }
                onCanEdit(row);
                return;
            });
        } else {
            res.status(400).end("incorrect thing type");
            return;
        }
    });

    app.post("/api/upload", function(req, res) {
        function onPhotoUpload() {
            auth.checkUserLoggedIn(req, res, function(data) {
                req.body.userId = data.id;
                try {
                    var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
                    var thingId = utils.checkParam(req.body, "thingId");
                    var fromUrl = utils.checkParam(req.body, "fromUrl");
                    var thing = utils.getThingFromId(thingId);
                    if(thing.type == 1) {
                        throw "you can't upload a photo for a comment";
                    }
                } catch(e) {

                    res.status(400).end(e.message);
                    return;
                }
                function detectAndRename(originalPath, newPath, cb) {
                    mmm.detectFile(originalPath, function(err, result) {
                        var ext = utils.mimetypeExtension(result);
                        if(!ext) {
                            cb({message: "invalid file", code: 400}, null, originalPath);
                            return;
                        }
                        var nnewPath = newPath + ext;
                        fs.rename(originalPath, __dirname + nnewPath);
                        cb(null, nnewPath);
                    });
                }
                function getPhotoFromUrl(newPath, cb) {
                    try {
                        var url = utils.checkParam(req.body, "url");
                    } catch(e) {
                        res.status(400).end(e.message);
                        return;
                    }
                    var tempPath = __dirname + newPath + Math.random().toString(36).substring(10);
                    var file = fs.createWriteStream(tempPath);
                    file.on("open", function(fd) {
                        var fileSize = 0;
                        var req = rq.get(url);
                        req.on("data", function(data) {
                            fileSize += data.length;
                            if(fileSize > global.config.photoSizeLimit) {
                                req.abort();
                                fs.unlink(tempPath);
                                res.status(400).end("photo is too big");
                                return;
                            }
                        }).on("end", function() {
                            detectAndRename(tempPath, newPath, cb);
                        }).on("close", function() {

                        }).on("error", function(data) {
                            fs.unlink(tempPath);
                            cb({message: "can't download photo: " + data, code: 400});
                        }).pipe(file);
                    });
                }
                function getPhotoFromForm(newPath, cb) {
                    try {
                        utils.checkParam(req, "file");
                    } catch(e) {
                        res.status(400).end(e.message);
                        return;
                    }
                    detectAndRename(req.file.path, newPath, cb);
                }
                mysqlPool.query("SELECT entityId AS id, author, title FROM suggestions WHERE entityId = ?", [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404).end("this suggestion doesn't exist");
                        return;
                    }
                    var suggestion = rows[0];
                    if(suggestion.author != userId) {
                        res.status(401).end("this suggestion is not yours");
                        return;
                    }
                    mysqlPool.query("SELECT COUNT(id) AS count FROM photos WHERE suggestion = ?", [thing.id], function(err, rows, fields) {
                        if(err) throw err;
                        var count = rows[0].count;
                        if(count >= global.config.maximumPhotos) {
                          res.status(422).end("maximum number of photos reached");
                          return;
                        }
                        function cb(err, newPath, oldPath) {
                            if(err) {
                                try {
                                    fs.unlinkSync(oldPath);
                                } catch(e) {}
                                res.status(200).json(err);
                                return;
                            }
                            mysqlPool.query("INSERT INTO photos (path, suggestion, position) VALUES (?, ?, ?)", [newPath, thing.id, count], function(err, rows, fields) {
                                if(err) {
                                    fs.unlinkSync(newPath);
                                    throw err;
                                }
                                logs.log("new photo for suggestion " + colors.bold(suggestion.title));
                                res.status(201).json({path: newPath, pid: rows.insertId.toString(36)});
                            });
                        }
                        var newPath = global.config.uploadDir + "/" + thing.id + "_" + Math.random().toString(36).substr(2);
                        if(fromUrl == "true") getPhotoFromUrl(newPath, cb);
                        else getPhotoFromForm(newPath, cb);
                    });
                });
            }, function() {
                res.status(401).end("authentification error");
                return;
            });
        }
        if(!Object.keys(req.body).length) {
            uploadPhoto(req, res, function(err) {
                if(err) {
                    res.status(400).end("Wrong file type");
                }
                onPhotoUpload();
            });
        } else {
            onPhotoUpload();
        }
    });

    app.post("/api/delete", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var thingId = utils.checkParam(req.body, "thingId");
            var thing = utils.getThingFromId(thingId);
            if(thing.type != 3) {
                throw "you can't delete this";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var photoId = thing.id;
        mysqlPool.query("SELECT path, author FROM photos LEFT JOIN suggestions ON photos.suggestion = suggestions.entityId WHERE photos.id = ?", [photoId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this photo doesn't exist");
                return;
            }
            if(rows[0].author != userId) {
                res.status(401).end("this suggestion is not yours");
                return;
            }
            var path = rows[0].path;
            mysqlPool.query("DELETE FROM photos WHERE id = ?", [photoId], function(err, rows, fields) {
                if(err) throw err;
                fs.unlink(__dirname + path, function() {
                    res.status(200).end();
                });
            });
        });
    });

    app.post("/api/follow", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var tagName = utils.checkParam(req.body, "tagName");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var params = [tagName, userId];
        mysqlPool.query("INSERT INTO userTags (user, tag) VALUES (?, (SELECT id FROM tags WHERE name = ?))", [userId, tagName], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).end();
        });
    });

    app.post("/api/unfollow", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var tagName = utils.checkParam(req.body, "tagName");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var params = [tagName, userId];
        mysqlPool.query("DELETE FROM userTags WHERE user = ? AND tag = (SELECT id FROM tags WHERE name = ?)", [userId, tagName], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).end();
        });
    });

    app.post("/api/publish", function(req, res) {
        try {
            var suggestionId = parseInt(utils.checkParam(req.body, "suggestionId"), 36);
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            if(isNaN(suggestionId)) {
                throw "incorrect suggestionId";
            } else if(isNaN(userId)) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("SELECT entityId AS id, author FROM suggestions WHERE entityId = ?", [suggestionId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this suggestion doesn't exist");
                return;
            }
            if(rows[0].author != userId) {
                res.status(403).end("this suggestion is private and you are not the author");
                return;
            }
            mysqlPool.query("UPDATE suggestions SET published = 1 WHERE entityId = ?", [suggestionId], function(err, rows, fields) {
                if(err) throw err;
                //check rows?
                res.status(200).end();
                return;
            });
        });
    });

    app.post("/api/report", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            var thingId = utils.checkParam(req.body, "thingId");
            var thing = utils.getThingFromId(thingId);
            var type = utils.checkParam(req.body, "type");
            var message = req.body.message;
            if(type == "other") {
                    if(!message) {
                        throw new Error("please enter a message");
                    }
            } else {
                message = type;
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }

        if(thing.type !== 0 && thing.type !== 1) {
            res.status(400).end("you can't report this");
            return;
        }
        mysqlPool.query("SELECT id FROM reports WHERE (author, entity) = (?, ?)", [userId, thing.id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length > 0) {
                mysqlPool.query("UPDATE reports SET entity = ?, message = ? WHERE id = ?", [thing.id, message, rows[0].id], function(err, rows, fields) {
                    if(err) throw err;
                    res.status(200).end();
                    return;
                });
            } else {
                mysqlPool.query("INSERT INTO reports (author, entity, message) VALUES (?, ?, ?)", [userId, thing.id, message], function(err, rows, fields) {
                    if(err) throw err;
                    res.status(200).end();
                    return;
                });
            }
        });
    });

    app.get("/api/user", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.query, "userId"), 36);
            if(isNaN(userId)) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("SELECT id, name, TIMESTAMPDIFF(SECOND, timeRegistered, CURRENT_TIMESTAMP) AS timeSinceRegistered FROM users WHERE id = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this user doesn't exist");
                return;
            }
            var profileData = rows[0];
            profileData.id = profileData.id.toString(36);
            profileData.timeSinceRegistered = utils.formatProfileTime(profileData.timeSinceRegistered);
            res.json(profileData);
        });
    });

    app.get("/api/users", function(req, res) {
        var start = parseInt(req.query.start) || 0;
        var limit = parseInt(req.query.limit) || 20;
        if(limit > 50) limit = 50;
        var nameLike = req.query.nameLike;
        var query = "SELECT name, timeRegistered FROM users";
        var params = [];
        if(nameLike) {
            query += " WHERE name LIKE ?";
            params.push(nameLike + "%");
        }
        query += " LIMIT ?, ?";
        params.push(start);
        params.push(limit);
        mysqlPool.query(query, params, function(err, rows, fields) {
            if(err) throw err;
            res.status(200).json(rows);
        });
    });

    app.get("/api/users/notifications", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.query, "userId"), 36);
            if(isNaN(userId)) {
                throw new Error("incorrect userId");
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        function notificationToJSON(row, callback) {
            var json = {};
            json.nid = row.id.toString(36);
            json.action = row.action;
            json.timeCreated = row.timeCreated;
            json.seen = row.seen;
            if(row.action == "report") {

            } else if(row.action == "mention" || row.action == "comment") {
                json.authorName = row.authorName;
                //another query to get comment and suggestion details, can't use a join because we didn't know the notification type
                mysqlPool.query("SELECT suggestions.entityId AS id, title, thread FROM comments INNER JOIN commentThreads ON comments.thread = commentThreads.id INNER JOIN suggestions ON commentThreads.suggestion = suggestions.entityId WHERE comments.entityId = ?", [row.entity], function(err, rows, fields) {
                    if(err) {
                        callback(err);
                        return;
                    }
                    if(rows.length === 0) {
                        mysqlPool.query("DELETE FROM userNotifications WHERE id = ?", [row.id], function(err, rows, fields) {
                            if(err) {
                                callback(err);
                                return;
                            }
                            callback();
                        });
                        return;
                    }
                    json.suggestionTitle = rows[0].title;
                    json.suggestionId = rows[0].id.toString(36);
                    json.threadId = rows[0].thread.toString(36);
                    json.commentId = row.entity.toString(36);
                    callback(null, json);
                });
            } else {
                callback(new Error("Unsupported notification thingType" + row.thingType));
            }
        }
        mysqlPool.query("SELECT userNotifications.id AS id, entity, author, action, timeCreated, seen, authors.name AS authorName FROM userNotifications INNER JOIN notifications ON userNotifications.notification = notifications.id INNER JOIN users AS authors ON notifications.author = authors.id WHERE user = ? ORDER BY timeCreated DESC LIMIT 20", [userId], function(err, rows, fields) {
            if(err) throw err;
            var convertFunctions = [];
            function addConvertFunction(i) {
                convertFunctions.push(function(callback) {
                    notificationToJSON(rows[i], callback);
                });
            }
            for(var i = 0; i < rows.length; i++) {
                addConvertFunction(i);
            }
            //series to keep the order
            async.series(convertFunctions, function(err, results) {
                if(err) {
                    res.status(500).end();
                    return;
                }
                results.filter(function(value) {
                    return value !== undefined;
                });
                res.status(200).json(results);
            });

        });
    });

    app.post("/api/users/notifications/mark/seen", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            if(isNaN(userId)) {
                throw "incorrect userId";
            }
            var notificationId = parseInt(utils.checkParam(req.body, "notificationId"), 36);
            if(isNaN(notificationId)) {
                throw "incorrect notificationId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("UPDATE userNotifications SET seen = 1 WHERE id = ?", [notificationId], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).end();
        });
    });

    app.get("/api/users/preferences", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.query, "userId"), 36);
            if(isNaN(userId)) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("SELECT digestFrequency, theme, privateTags, privateSuggestions FROM preferences WHERE user = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length === 0) {
                res.status(404).end("user preferences not found");
                return;
            }
            res.status(200).json(rows[0]);
        });
    });

    app.post("/api/users/preferences/edit", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.body, "userId"), 36);
            if(isNaN(userId)) {
                throw "incorrect userId";
            }
            var changes = utils.checkParam(req.body, "editObject");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var query = "UPDATE preferences SET ";
        var params = [];
        for(var preference in changes) {
            if(changes.hasOwnProperty(preference)) {
                query += mysqlPool.escapeId(preference) + "= ?, ";
                params.push(changes[preference]);
            }
        }
        if(params.length === 0) {
            res.status(400).end("no changes provided");
            return;
        }
        query = query.substr(0, query.length - 2) + " WHERE user = ?";
        params.push(userId);
        mysqlPool.query(query, params, function(err, rows, fields) {
            if(err) {
                res.status(500).end();
                return;
            }
            res.status(200).end();
        });
    });
    
    app.get("/api/tags", function(req, res) {
        var prefix = req.query.prefix;
        if(prefix === null || prefix === undefined || prefix === "") {
            res.status(200).json({});
            return;
        }
        mysqlPool.query("SELECT id, name FROM tags WHERE name LIKE ? LIMIT 10", [prefix + "%"], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).json(rows);
        });
    });

    app.get("/api/userTags", function(req, res) {
        try {
            var userId = parseInt(utils.checkParam(req.query, "userId"), 36);
            if(isNaN(userId)) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlPool.query("SELECT tags.id AS tid, name FROM userTags INNER JOIN tags ON userTags.tag = tags.id WHERE user = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).json(rows);
        });
    });

    app.get("/api/tags/popular", function(req, res) {
        try {
            var location = parseCoordinates(req.query);
        } catch(e) {
            res.status(400).end(e.message);
        }
        var query, params;
        if(location) {
            query = "SELECT count, name FROM (SELECT COUNT(suggestions.entityId) AS count, tag FROM suggestionTags INNER JOIN suggestions ON suggestionTags.suggestion = suggestions.entityId AND suggestions.published = 1 AND " + queries.distance + " < ? GROUP BY tag ORDER BY count DESC LIMIT 20) AS suggestionTags INNER JOIN tags ON suggestionTags.tag = tags.id";
            params = [location.lat, location.lat, location.lon, 51000];
        } else {
            query = "SELECT count, name FROM (SELECT COUNT(suggestions.entityId) AS count, tag FROM suggestionTags GROUP BY tag ORDER BY count DESC LIMIT 5) AS suggestionTags INNER JOIN tags ON suggestionTags.tag = tags.id";
            params = [];
        }
        mysqlPool.query(query, params, function(err, rows, fields) {
            if(err) throw err;
            res.status(200).json(rows);
        });
    });

    return {
        makeLocalAPICall: function(method, path, params, callback) {
            function reqCallback(err, res, body) {
                if(callback) {
                    if(res.statusCode >= 400 && res.statusCode < 500) {
                        callback({code: res.statusCode}, null);
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
    };
};
