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

module.exports = function(app, mysqlConnection, auth) {

    function testTransactionError(err, beforeCallback) {
        if(err) {
            mysqlConnection.rollback();
            if(beforeCallback) {
                beforeCallback();
            }
            throw err;
        }
    }

    function checkParam(params, toCheck) {
        if(!params[toCheck]) {
            throw new Error("parameter " + toCheck + " is missing");
        }
        return params[toCheck];
    }

    function checkUserExists(id, res, callback) {
        mysqlConnection.query("SELECT name FROM users WHERE id = ?", [id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this user doesn't exist");
                return;
            }
            callback(true, rows[0]);
        });
    };

    app.use("/api/*", function(req, res, next) {
        if(req.ip === "::ffff:127.0.0.1" || req.ip === "127.0.0.1" || req.ip === "::1") {
            next();
        } else {
            console.log(req.ip);
            res.status(401).end();
        }
    });

    app.get(["/api/suggestions/:mode", "/api/suggestions/"], function(req, res) {
        var mode = req.params.mode;
        if(!mode) {
            mode = "all";
        }
        var start = parseInt(req.query.start) || 0;
        var limit = parseInt(req.query.limit) || 10;
        if(limit > 50) limit = 50;
        var userId = req.query.userId;
        if(userId) {
            userId = parseInt(userId, 36);
        }
        var authorId = req.query.authorId;
        if(authorId) {
            authorId = parseInt(authorId, 36);
        }
        var tagName = req.query.tagName;
        var location = req.query.lat && req.query.lon;

        var selectParams = [];
        var subqueryParams = [];
        var joinParams = [];
        var whereParams = [];
        var confQuery = "(upvotes + 1) / (upvotes + downvotes + 1) - 1 / SQRT(upvotes + downvotes + 1) AS conf";
        var descrQuery = "IF(LENGTH(descr) > 256, CONCAT(SUBSTRING(descr, 1, 256), '...'), descr) AS descr";
        var scoreQuery = "CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score";
        var distanceQuery = "12742000 * ASIN(SQRT(POW(SIN(RADIANS(lat / 10000000 - ?) / 2), 2) + COS(RADIANS(lat / 10000000)) * COS(RADIANS(?)) * POW(SIN(RADIANS(lon / 10000000 - ?) / 2), 2))) AS dist";
        var voteJoin = "LEFT JOIN votes ON suggestions.id = votes.suggestion AND user = ?";
        var photoJoin = "LEFT JOIN photos ON photos.suggestion = suggestions.id AND position = 0";

        var selectQuery = "SELECT";
        var fromQuery = "FROM suggestions";
        var whereQuery = "WHERE published = 1";
        var havingQuery = "";
        var orderByQuery = "ORDER BY conf DESC";
        try {
            if(mode == "all") {
                selectQuery += " suggestions.id AS id, title, published, timeCreated, author, " + descrQuery + ", " + scoreQuery + ", " + confQuery + ", path AS thumb";
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
                    interestSubquery += " suggestions.id, title, published, timeCreated, author, " + descrQuery + ", " + scoreQuery + ", " + confQuery + " FROM suggestions INNER JOIN suggestionTags ON suggestions.id = suggestionTags.suggestion INNER JOIN userTags ON userTags.tag = suggestionTags.tag AND userTags.user = ? GROUP BY suggestions.id) AS suggestions";
                    selectQuery += " suggestions.id AS id, title, published, timeCreated, descr, score, conf, author, dir, path AS thumb ";
                    subqueryParams.push(userId);
                    fromQuery = "FROM " + interestSubquery + " " + voteJoin;
                    joinParams.push(userId);
                } else {
                    throw new Error("you need to be logged in to see your interests");
                }
            } else if(mode == "tag") {
                selectQuery += " suggestions.id AS id, title, published, timeCreated, author, " + descrQuery + ", " + scoreQuery + ", " + confQuery + ", path AS thumb";
                if(userId) {
                    selectQuery += ", dir";
                    fromQuery += " " + voteJoin;
                    joinParams.push(userId);
                }
                fromQuery += " " + "INNER JOIN suggestionTags ON suggestions.id = suggestionTags.suggestion INNER JOIN tags ON suggestionTags.tag = tags.id AND tags.name = ?";
                joinParams.push(tagName);
            } else if(mode == "profile") {
                if(!authorId) {
                    throw new Error("please specify a valid authorId");
                }
                selectQuery += " suggestions.id AS id, title, published, timeCreated, author, " + descrQuery + ", " + scoreQuery + ", " + confQuery + ", path AS thumb";
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
                selectQuery += ", " + distanceQuery;
                havingQuery = "HAVING dist < 51000";
                selectParams.push(req.query.lat);
                selectParams.push(req.query.lat);
                selectParams.push(req.query.lon);
            }
        } catch(e) {
            res.status(400).end(e.message);
        }

        var query = selectQuery + " " + fromQuery + " " + photoJoin + " " + whereQuery + " " + havingQuery + " " + orderByQuery + " LIMIT ?, ?";
        var params = selectParams.concat(subqueryParams).concat(joinParams).concat(whereParams);
        params.push(start);
        params.push(limit);
        //console.log(query, params);
        mysqlConnection.query(query, params, function(err, rows, fields) {
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
        mysqlConnection.query("SELECT suggestions.id AS id, title, descr, author, users.name AS authorName, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, published FROM suggestions LEFT JOIN users ON suggestions.author = users.id WHERE suggestions.id = ?", [id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this suggestion doesn't exist");
                return;
            }
            var suggestionData = rows[0];
            if(suggestionData.published == 0 && (!userId || userId != suggestionData.author)) {
                console.log(userId, suggestionData.author);
                res.status(403).end("this suggestion is private and you are not the author");
                return;
            }
            function sendComments(photos, voteDir) {
                var query, params;
                var confQuery = "(upvotes + 1) / (upvotes + downvotes + 1) - 1 / SQRT(upvotes + downvotes + 1) + (UNIX_TIMESTAMP(timeCreated) - 1465549200) / 1209600 AS conf";
                var orderQuery = "ORDER BY IF(parent IS NULL, 0, 1), IF(parent IS NULL, conf, -timeCreated) DESC";
                if(userId) {
                    query = "SELECT content, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, " + confQuery + ", comments.id AS id, votes.dir AS dir, parent FROM comments LEFT JOIN users ON comments.author = users.id LEFT JOIN votes ON votes.comment = comments.id AND votes.user = ? WHERE comments.suggestion = ? " + orderQuery;
                    params = [userId, suggestionData.id];
                } else {
                    query = "SELECT content, TIME(timeCreated) AS time, timeCreated, users.name AS author, users.id AS authorId, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, " + confQuery + ", comments.id AS id, parent FROM comments LEFT JOIN users ON comments.author = users.id WHERE suggestion = ? " + orderQuery;
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
                            if(c.authorId != null) {
                                c.authorId = c.authorId.toString(36);
                            }
                            for(var j = 0; j < c.children.length; j++) {
                                c.children[j].id = c.children[j].id.toString(36);
                            }
                            formattedComments.push(c);
                        }
                    }
                    var author = suggestionData.author;
                    if(author) {
                        author = author.toString(36);
                    }
                    //get tags and send response with everything
                    mysqlConnection.query("SELECT tags.id AS tid, tags.name AS name FROM suggestionTags LEFT JOIN tags ON tags.id = tag WHERE suggestion = ?", [suggestionData.id], function(err, tagRows, fields) {
                        if(err) throw err;
                        res.json({title: suggestionData.title,
                                  descr: suggestionData.descr,
                                  author: author,
                                  authorName: suggestionData.authorName,
                                  sid: suggestionData.id.toString(36),
                                  score: suggestionData.score,
                                  comments: formattedComments,
                                  tags: tagRows,
                                  photos: photos,
                                  voteDir: voteDir,
                                  maximumPhotos: global.config.maximumPhotos,
                                  published: suggestionData.published});
                    });
                });
            }

            //get the photos
            mysqlConnection.query("SELECT id, path FROM photos WHERE suggestion = ? ORDER BY position", [suggestionData.id], function(err, photoRows, fields) {
                if(err) throw err;
                for(var i = 0; i < photoRows.length; i++) {
                    photoRows[i].id = photoRows[i].id.toString(36);
                }
                if(userId) {
                    mysqlConnection.query("SELECT dir FROM votes WHERE suggestion = ? AND user = ?", [id, userId], function(err, voteRows, fields) {
                        if(err) throw err;
                        if(voteRows.length != 1) {
                            sendComments(photoRows);
                        } else {
                            sendComments(photoRows, voteRows[0].dir);
                        }
                    })
                } else {
                    sendComments(photoRows);
                }
            });
        });
    });

    app.post("/api/vote", function(req, res) {
        try {
            var thingId = checkParam(req.body, "thingId");
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var dir = checkParam(req.body, "dir");
            var thing = utils.getThingFromId(req.body.thingId);
        } catch(e) {
            res.status(400).end(e.message)
            return;
        }
        checkUserExists(userId, res, function(ok, row) {
            var dirField = utils.voteDirToField(dir);
            var username = row.name;
            if(thing.type === 0) {
                mysqlConnection.query("SELECT title FROM suggestions WHERE id = ?", [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404).end("this suggestion doesn't exist");
                        return;
                    }
                    var suggestionTitle = rows[0].title;
                    if(dir == 0) {
                        mysqlConnection.query("SELECT id, dir FROM votes WHERE suggestion = ? AND user = ?", [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400).end("no vote to cancel");
                                return;
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                mysqlConnection.beginTransaction(function(err) {
                                    if(err) throw err;
                                    mysqlConnection.query("DELETE FROM votes WHERE id = ?", [rows[0].id], function(err, rows, fields) {
                                        testTransactionError(err);
                                        mysqlConnection.query("UPDATE suggestions SET " + prevDirField + " = " + prevDirField + " - 1 WHERE id = ?", [thing.id], function(err, rows, fields) {
                                            testTransactionError(err);
                                            mysqlConnection.commit(function(err) {
                                                testTransactionError(err);
                                                logs.log("user " + colors.bold(username) + " canceled his " + (prevDir == 1 ? "up" : "down") + "vote on " + colors.bold(suggestionTitle));
                                            });
                                        });
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
                                    testTransactionError(err);
                                    mysqlConnection.commit(function(err) {
                                        testTransactionError(err);
                                        logs.log("user " + colors.bold(username) + " " + (up ? "upvoted" : "downvoted") + " an entry " + colors.bold(suggestionTitle));
                                    });
                                });
                            }
                            mysqlConnection.beginTransaction(function(err) {
                                if(err) throw err;
                                if(rows.length == 0) {
                                    mysqlConnection.query('UPDATE suggestions SET ' + dirField + ' = ' + dirField + ' + 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                        testTransactionError(err);
                                        registerVote();
                                    });
                                } else {
                                    var prevDir = rows[0].dir;
                                    var prevDirField = utils.voteDirToField(prevDir);
                                    var wasUp = prevDir === 1;
                                    if(up != wasUp) {
                                        mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                            testTransactionError(err);
                                            mysqlConnection.query('UPDATE suggestions SET ' + dirField + ' = ' + dirField + ' + 1, ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                                testTransactionError(err);
                                                registerVote();
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
                mysqlConnection.query('SELECT author FROM comments WHERE id = ?', [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404).end("this comment doesn't exist");
                        return;
                    }
                    var commentAuthor = rows[0].author;
                    if(dir == 0) {
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE comment = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400).end("no vote to cancel");
                                return;
                            } else {
                                var prevDir = rows[0].dir;
                                var prevDirField = utils.voteDirToField(prevDir);
                                mysqlConnection.beginTransaction(function(err) {
                                    if(err) throw err;
                                    mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                        testTransactionError(err);
                                        mysqlConnection.query('UPDATE comments SET ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                            testTransactionError(err);
                                            mysqlConnection.commit(function(err) {
                                                testTransactionError(err);
                                            })
                                        });
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
                                    testTransactionError(err);
                                    mysqlConnection.commit(function(err) {
                                        testTransactionError(err);
                                    })
                                });
                            }
                            mysqlConnection.beginTransaction(function(err) {
                                if(err) throw err;
                                if(rows.length == 0) {
                                    mysqlConnection.query('UPDATE comments SET ' + dirField + ' = ' + dirField + ' + 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                        testTransactionError(err);
                                        registerVote();
                                    });
                                } else {
                                    var prevDir = rows[0].dir;
                                    var prevDirField = utils.voteDirToField(prevDir);
                                    var wasUp = prevDir === 1;
                                    if(up != wasUp) {
                                        mysqlConnection.query('DELETE FROM votes WHERE id = ?', [rows[0].id], function(err, rows, fields) {
                                            testTransactionError(err);
                                            mysqlConnection.query('UPDATE comments SET ' + dirField + ' = ' + dirField + ' + 1, ' + prevDirField + ' = ' + prevDirField + ' - 1 WHERE id = ?', [thing.id], function(err, rows, fields) {
                                                testTransactionError(err);
                                                registerVote();
                                            });
                                        });
                                    }
                                }
                            })
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

    app.post("/api/comment", function (req, res) {
        try {
            var suggestionId = checkParam(req.body, "suggestionId");
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var content = checkParam(req.body, "content");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var id = parseInt(suggestionId, 36);
        checkUserExists(userId, res, function(ok, row) {
            var username = row.name;
            mysqlConnection.query('SELECT id, title FROM suggestions WHERE id = ?', [id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404).end("this suggestion doesn't exist");
                    return;
                }
                var suggestionData = rows[0];
                function sendComment(parent) {
                    var query, params;
                    if(parent) {
                        query = 'INSERT INTO comments (author, content, suggestion, parent) VALUES (?, ?, ?, ?)';
                        params = [userId, content, id, parent];
                    } else {
                        query = 'INSERT INTO comments (author, content, suggestion) VALUES (?, ?, ?)';
                        params = [userId, content, id];
                    }
                    mysqlConnection.query(query, params, function(err, rows, fields) {
                        if(err) throw err;
                        var cid = parseInt(rows.insertId);
                        res.status(201).end(cid.toString(36));
                        logs.log("user " + colors.bold(username) + " commented on " + colors.bold(suggestionData.title));
                    });
                }
                if(req.body.parent) {
                    var parent = parseInt(req.body.parent, 36);
                    mysqlConnection.query('SELECT id FROM comments WHERE id = ?', [parent], function(err, rows, fields) {
                        if(err) throw err;
                        if(rows.length != 1) {
                            res.status(404).end("this parent comment doesn't exist");
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
        try {
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var title = checkParam(req.body, "title");
            var descr = checkParam(req.body, "descr");
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
                res.status(201).end(sid.toString(36));
                return;
            });
        });
    });

    app.post("/api/edit", function(req, res) {
        try {
            var user = checkParam(req.body, "user");
            user.id = parseInt(user.id, 36);
            var edit = checkParam(req.body, "edit");
            var thingId = checkParam(edit, "thingId");
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
                mysqlConnection.beginTransaction(function(err) {
                    if(err) throw err;
                    var queryFunctions = [];
                    Array.prototype.forEach.call(order, function(photoId, i) {
                        queryFunctions.push(function(callback) {
                            mysqlConnection.query("UPDATE photos SET position = ? WHERE id = ?", [i, parseInt(photoId, 36)], function(err, rows, fields) {
                                testTransactionError(err);
                                callback();
                            });
                        });
                    });
                    async.parallel(queryFunctions, function(err, results) {
                        if(err) {
                            callback(true);
                            return;
                        }
                        mysqlConnection.commit(function(err) {
                            testTransactionError(err);
                            callback();
                        });
                    });
                });
            }
            function editDescription(callback) {
                edited = true;
                mysqlConnection.query("UPDATE suggestions SET descr = ? WHERE id = ?", [edit.descr, thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    callback();
                });
            }
            function editTagsAdded(callback) {
                edited = true;
                var tags = edit.tagsAdded;
                mysqlConnection.beginTransaction(function(err) {
                    if(err) throw err;
                    var queryFunctions = [];
                    Array.prototype.forEach.call(tags, function(tag) {
                        if(tag.tid) {
                            queryFunctions.push(function(callback) {
                                mysqlConnection.query("INSERT INTO suggestionTags (suggestion, tag) VALUES (?, ?)", [suggestion.id, tag.tid], function(err, rows, fields) {
                                    testTransactionError(err);
                                    callback();
                                });
                            });
                        } else if(tag.name) {
                            tag.name = tag.name.replace(/\w\S*/g, function(t) {
                                return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
                            });
                            queryFunctions.push(function(callback) {
                                mysqlConnection.query("INSERT INTO tags (name) VALUES (?)", [tag.name], function(err, rows, fields) {
                                    //if duplicate, don't throw error
                                    if(err) {
                                        if(err.code == "ER_DUP_ENTRY") {
                                            mysqlConnection.query("INSERT INTO suggestionTags (suggestion, tag) VALUES (?, (SELECT id FROM tags WHERE name = ?))", [suggestion.id, tag.name], function(err, rows, fields) {
                                                testTransactionError(err);
                                                callback();
                                            });
                                        } else {
                                            testTransactionError(err);
                                        }
                                    } else {
                                        mysqlConnection.query("INSERT INTO suggestionTags (suggestion, tag) VALUES (?, ?)", [suggestion.id, rows.insertId], function(err, rows, fields) {
                                            testTransactionError(err);
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
                        mysqlConnection.commit(function(err) {
                            testTransactionError(err);
                            callback();
                        });
                    })
                });
            }
            function editTagsRemoved(callback) {
                edited = true;
                var tags = edit.tagsRemoved;
                mysqlConnection.beginTransaction(function(err) {
                    if(err) throw err;
                    var queryFunctions = [];
                    Array.prototype.forEach.call(tags, function(tag) {
                        if(!tag.tid) return;
                        queryFunctions.push(function(callback) {
                            mysqlConnection.query("DELETE FROM suggestionTags WHERE (suggestion, tag) = (?, ?)", [suggestion.id, tag.tid], function(err, rows, fields) {
                                testTransactionError(err);
                                callback();
                            });
                        });
                    });
                    async.parallel(queryFunctions, function(err, results) {
                        if(err) {
                            callback(true);
                            return;
                        }
                        mysqlConnection.commit(function(err) {
                            testTransactionError(err);
                            callback();
                        });
                    })
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
        if(thing.type == 0) {
            mysqlConnection.query("SELECT id, author, title FROM suggestions WHERE id = ?", [thing.id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404).end("this suggestion doesn't exist");
                    return;
                }
                var suggestion = rows[0];
                if(suggestion.author != user.id) {
                    res.status(401).end("this suggestion is not yours");
                    return;
                }
                editSuggestion(suggestion);
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
                    var userId = parseInt(checkParam(req.body, "userId"), 36);
                    var thingId = checkParam(req.body, "thingId");
                    var fromUrl = checkParam(req.body, "fromUrl");
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
                        var url = checkParam(req.body, "url");
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
                        checkParam(req, "file");
                    } catch(e) {
                        res.status(400).end(e.message);
                        return;
                    }
                    detectAndRename(req.file.path, newPath, cb);
                }
                mysqlConnection.query("SELECT id, author, title FROM suggestions WHERE id = ?", [thing.id], function(err, rows, fields) {
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
                    mysqlConnection.query("SELECT COUNT(id) AS count FROM photos WHERE suggestion = ?", [thing.id], function(err, rows, fields) {
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
                                } catch(e) {};
                                res.status(200).json(err);
                                return;
                            }
                            mysqlConnection.query("INSERT INTO photos (path, suggestion, position) VALUES (?, ?, ?)", [newPath, thing.id, count], function(err, rows, fields) {
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
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var thingId = checkParam(req.body, "thingId");
            var thing = utils.getThingFromId(thingId);
            if(thing.type != 3) {
                throw "you can't delete this";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var photoId = thing.id;
        mysqlConnection.query("SELECT path, author FROM photos LEFT JOIN suggestions ON photos.suggestion = suggestions.id WHERE photos.id = ?", [photoId], function(err, rows, fields) {
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
            mysqlConnection.query("DELETE FROM photos WHERE id = ?", [photoId], function(err, rows, fields) {
                if(err) throw err;
                fs.unlink(__dirname + path, function() {
                    res.status(200).end();
                });
            });
        });
    });

    app.post("/api/follow", function(req, res) {
        try {
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var tagName = checkParam(req.body, "tagName");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var params = [tagName, userId];
        mysqlConnection.query("INSERT INTO userTags (user, tag) VALUES (?, (SELECT id FROM tags WHERE name = ?))", [userId, tagName], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).end();
        });
    });

    app.post("/api/unfollow", function(req, res) {
        try {
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var tagName = checkParam(req.body, "tagName");
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        var params = [tagName, userId];
        mysqlConnection.query("DELETE FROM userTags WHERE user = ? AND tag = (SELECT id FROM tags WHERE name = ?)", [userId, tagName], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).end();
        });
    });

    app.post("/api/publish", function(req, res) {
        try {
            var suggestionId = parseInt(checkParam(req.body, "suggestionId"), 36);
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            if(suggestionId == NaN) {
                throw "incorrect suggestionId";
            } else if(userId == NaN) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlConnection.query("SELECT id, author FROM suggestions WHERE id = ?", [suggestionId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this suggestion doesn't exist");
                return;
            }
            if(rows[0].author != userId) {
                res.status(403).end("this suggestion is private and you are not the author");
                return;
            }
            mysqlConnection.query("UPDATE suggestions SET published = 1 WHERE id = ?", [suggestionId], function(err, rows, fields) {
                if(err) throw err;
                //check rows?
                res.status(200).end();
                return;
            });
        });
    });

    app.post("/api/report", function(req, res) {
        try {
            var userId = parseInt(checkParam(req.body, "userId"), 36);
            var thingId = checkParam(req.body, "thingId");
            var thing = utils.getThingFromId(thingId);
            var type = checkParam(req.body, "type");
            var message = req.body.message;
            if(type == "other") {
                    if(!message) {
                        throw new Error("please enter a message");
                    }
            } else {
                message = type;
            }
            if(thing.type != 0) {
                throw new Error("you can't report this");
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlConnection.query("SELECT id FROM reports WHERE (author, suggestion) = (?, ?)", [userId, thing.id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length > 0) {
                mysqlConnection.query("UPDATE reports SET author = ?, suggestion = ?, message = ? WHERE id = ?", [userId, thing.id, message, rows[0].id], function(err, rows, fields) {
                    if(err) throw err;
                    res.status(200).end();
                    return;
                });
            } else {
                mysqlConnection.query("INSERT INTO reports (author, suggestion, message) VALUES (?, ?, ?)", [userId, thing.id, message], function(err, rows, fields) {
                    if(err) throw err;
                    res.status(200).end();
                    return;
                });
            }
        });
    });

    app.get("/api/user", function(req, res) {
        try {
            var userId = parseInt(checkParam(req.query, "userId"), 36);
            if(userId == NaN) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlConnection.query("SELECT id, name, TIMESTAMPDIFF(SECOND, timeRegistered, CURRENT_TIMESTAMP) AS timeSinceRegistered FROM users WHERE id = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404).end("this user doesn't exist");
                return;
            }
            var profileData = rows[0];
            profileData.timeSinceRegistered = utils.formatProfileTime(profileData.timeSinceRegistered);
            res.json(profileData);
        });
    });

    app.get("/api/tags", function(req, res) {
        var prefix = req.query.prefix;
        if(prefix === null || prefix === undefined || prefix === "") {
            res.status(200).json({});
            return;
        }
        mysqlConnection.query("SELECT id, name FROM tags WHERE name LIKE ? LIMIT 10", [prefix + "%"], function(err, rows, fields) {
            if(err) throw err;
            res.status(200).json(rows);
        });
    });

    app.get("/api/userTags", function(req, res) {
        try {
            var userId = parseInt(checkParam(req.query, "userId"), 36);
            if(userId == NaN) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400).end(e.message);
            return;
        }
        mysqlConnection.query("SELECT tags.id AS tid, name FROM userTags INNER JOIN tags ON userTags.tag = tags.id WHERE user = ?", [userId], function(err, rows, fields) {
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
    }
};
