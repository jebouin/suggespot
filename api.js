//todo: add database error
//todo: generalize errors

const logs = require("./logs");
const http = require("http");
const rq = require("request");
const urlut = require("url");
const multer = require("multer");
const mime = require("mime-types");
const mmmagic = require("mmmagic");
const mmm = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE);

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
                res.status(404);
                res.end("this user doesn't exist");
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
            res.status(401);
            res.end();
        }
    });

    app.get("/api/suggestions", function(req, res) {
        var userId = req.query.userId;
        var query;
        var params;
        var confQuery = "upvotes / (upvotes + downvotes + 1) - 1 / SQRT(upvotes + downvotes + 1) AS conf";
        if(userId) {
            query = "SELECT suggestions.id AS id, title, IF(LENGTH(descr) > 256, CONCAT(SUBSTRING(descr, 1, 256), '...'), descr) AS descr, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, " + confQuery + ", author, dir, path AS thumb FROM suggestions LEFT JOIN votes ON suggestions.id = votes.suggestion AND user = ? LEFT JOIN photos ON photos.suggestion = suggestions.id AND position = 0 WHERE published = 1 ORDER BY conf DESC";
            params = [userId];
        } else {
            query = "SELECT suggestions.id, title, IF(LENGTH(descr) > 256, CONCAT(SUBSTRING(descr, 1, 256), '...'), descr) AS descr, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, " + confQuery + ", author, path AS thumb FROM suggestions LEFT JOIN photos ON photos.suggestion = suggestions.id AND position = 0 WHERE published = 1 ORDER BY conf DESC";
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
            res.end("invalid suggestion url");
            return;
        }
        id = parseInt(id, 36);
        mysqlConnection.query("SELECT suggestions.id AS id, title, descr, author, users.name AS authorName, CAST(upvotes AS SIGNED) - CAST(downvotes AS SIGNED) AS score, published FROM suggestions LEFT JOIN users ON suggestions.author = users.id WHERE suggestions.id = ?", [id], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("this suggestion doesn't exist");
                return;
            }
            var suggestionData = rows[0];
            if(suggestionData.published == 0 && (!userId || userId != suggestionData.author)) {
                res.status(403);
                res.end("this suggestion is private and you are not the author");
                return;
            }
            function sendComments(photos, voteDir) {
                var query, params;
                var confQuery = "upvotes / (upvotes + downvotes + 1) - 1 / SQRT(upvotes + downvotes + 1) + (UNIX_TIMESTAMP(timeCreated) - 1465549200) / 1209600 AS conf";
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
                    res.json({title: suggestionData.title,
                              descr: suggestionData.descr,
                              author: author,
                              authorName: suggestionData.authorName,
                              sid: suggestionData.id.toString(36),
                              score: suggestionData.score,
                              comments: formattedComments,
                              photos: photos,
                              voteDir: voteDir,
                              maximumPhotos: global.config.maximumPhotos,
                              published: suggestionData.published});
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
            var userId = checkParam(req.body, "userId");
            var dir = checkParam(req.body, "dir");
            var thing = utils.getThingFromId(req.body.thingId);
        } catch(e) {
            res.status(400);
            res.end(e.message)
            return;
        }
        checkUserExists(userId, res, function(ok, row) {
            if(!ok) {
                return;
            }
            var dirField = utils.voteDirToField(dir);
            var username = row.name;
            if(thing.type === 0) {
                mysqlConnection.query("SELECT title FROM suggestions WHERE id = ?", [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404);
                        res.end("this suggestion doesn't exist");
                        return;
                    }
                    var suggestionTitle = rows[0].title;
                    if(dir == 0) {
                        mysqlConnection.query("SELECT id, dir FROM votes WHERE suggestion = ? AND user = ?", [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400);
                                res.end("no vote to cancel");
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
                    res.status(200);
                    res.end();
                    return;
                });
            } else if(thing.type == 1) {
                mysqlConnection.query('SELECT author FROM comments WHERE id = ?', [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404);
                        res.end("this comment doesn't exist");
                        return;
                    }
                    var commentAuthor = rows[0].author;
                    if(dir == 0) {
                        mysqlConnection.query('SELECT id, dir FROM votes WHERE comment = ? AND user = ?', [thing.id, userId], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length != 1) {
                                res.status(400);
                                res.end("no vote to cancel");
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
                    res.status(200);
                    res.end();
                    return;
                });
            }
        });
    });

    app.post("/api/comment", function (req, res) {
        try {
            var suggestionId = checkParam(req.body, "suggestionId");
            var userId = checkParam(req.body, "userId");
            var content = checkParam(req.body, "content");
        } catch(e) {
            res.status(400);
            res.end(e.message);
            return;
        }
        var id = parseInt(suggestionId, 36);
        checkUserExists(userId, res, function(ok, row) {
            var username = row.name;
            mysqlConnection.query('SELECT id, title FROM suggestions WHERE id = ?', [id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404);
                    res.end("this suggestion doesn't exist");
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
                            res.end("this parent comment doesn't exist");
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
            var userId = checkParam(req.body, "userId");
            var title = checkParam(req.body, "title");
            var descr = checkParam(req.body, "descr");
        } catch(e) {
            res.status(400);
            res.end(e.message);
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
                res.status(201);
                res.end(sid.toString(36));
                return;
            });
        });
    });

    app.post("/api/edit", function(req, res) {
        try {
            var user = checkParam(req.body, "user");
            var edit = checkParam(req.body, "edit");
            var thingId = checkParam(edit, "thingId");
            var thing = utils.getThingFromId(thingId);
        } catch(e) {
            res.status(400);
            res.end(e.message);
            return;
        }
        user.id = parseInt(user.id, 36);
        if(thing.type == 0) {
            mysqlConnection.query("SELECT id, author, title FROM suggestions WHERE id = ?", [thing.id], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length != 1) {
                    res.status(404);
                    res.end("this suggestion doesn't exist");
                    return;
                }
                var suggestion = rows[0];
                if(suggestion.author != user.id) {
                    res.status(401);
                    res.end("this suggestion is not yours");
                    return;
                }
                var edited = false;
                function onEditFinished() {
                    res.status(200);
                    res.end();
                    logs.log("user " + colors.bold(user.name) + " edited their suggestion " + colors.bold(suggestion.title));
                }
                function onInvalidEdit() {
                    res.status(400);
                    res.end("invalid edit reqest");
                }
                if(edit.descr) {
                    edited = true;
                    mysqlConnection.query("UPDATE suggestions SET descr = ? WHERE id = ?", [edit.descr, thing.id], function(err, rows, fields) {
                        if(err) throw err;
                        onEditFinished();
                    });
                }
                if(edit.photosOrder) {
                    edited = true;
                    var order = edit.photosOrder;
                    if(order.length == 0) {
                        onInvalidEdit();
                    } else {
                        mysqlConnection.beginTransaction(function(err) {
                            if(err) throw err;
                            for(var i = 0; i < order.length; i++) {
                                var photoId = parseInt(order[i], 36);
                                mysqlConnection.query("UPDATE photos SET position = ? WHERE id = ?", [i, photoId], function(err, rows, fields) {
                                    testTransactionError(err);
                                });
                            }
                            mysqlConnection.commit(function(err) {
                                testTransactionError(err);
                                onEditFinished();
                            });
                        });
                    }
                }
                if(!edited) {
                    onInvalidEdit();
                }
                return;
            });
        }
    });

    app.post("/api/upload", function(req, res) {
        function onPhotoUpload() {
            auth.checkUserLoggedIn(req, res, function(data) {
                req.body.userId = data.id;
                try {
                    var userId = checkParam(req.body, "userId");
                    var thingId = checkParam(req.body, "thingId");
                    var fromUrl = checkParam(req.body, "fromUrl");
                    var thing = utils.getThingFromId(thingId);
                    if(thing.type == 1) {
                        throw "you can't upload a photo for a comment";
                    }
                } catch(e) {
                    res.status(400);
                    res.end(e.message);
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
                        res.status(400);
                        res.end(e.message);
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
                                res.status(400);
                                res.end("photo is too big");
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
                        res.status(400);
                        res.end(e.message);
                        return;
                    }
                    detectAndRename(req.file.path, newPath, cb);
                }
                mysqlConnection.query("SELECT id, author, title FROM suggestions WHERE id = ?", [thing.id], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length != 1) {
                        res.status(404);
                        res.end("this suggestion doesn't exist");
                        return;
                    }
                    var suggestion = rows[0];
                    if(suggestion.author != userId) {
                        res.status(401);
                        res.end("this suggestion is not yours");
                        return;
                    }
                    mysqlConnection.query("SELECT COUNT(id) AS count FROM photos WHERE suggestion = ?", [thing.id], function(err, rows, fields) {
                        if(err) throw err;
                        var count = rows[0].count;
                        if(count >= global.config.maximumPhotos) {
                          res.status(422);
                          res.end("maximum number of photos reached");
                          return;
                        }
                        function cb(err, newPath, oldPath) {
                            if(err) {
                                try {
                                    fs.unlinkSync(oldPath);
                                } catch(e) {};
                                res.status(200);
                                res.json(err);
                                return;
                            }
                            mysqlConnection.query("INSERT INTO photos (path, suggestion, position) VALUES (?, ?, ?)", [newPath, thing.id, count], function(err, rows, fields) {
                                if(err) {
                                    fs.unlinkSync(newPath);
                                    throw err;
                                }
                                logs.log("new photo for suggestion " + colors.bold(suggestion.title));
                                res.status(201);
                                res.json({path: newPath, pid: rows.insertId.toString(36)});
                            });
                        }
                        var newPath = global.config.uploadDir + "/" + thing.id + "_" + count;
                        if(fromUrl == "true") getPhotoFromUrl(newPath, cb);
                        else getPhotoFromForm(newPath, cb);
                    });
                });
            }, function() {
                res.status(401);
                res.end("authentification error");
                return;
            });
        }
        if(!Object.keys(req.body).length) {
            uploadPhoto(req, res, function(err) {
                onPhotoUpload();
            });
        } else {
            onPhotoUpload();
        }
    });

    app.post("/api/delete", function(req, res) {
        try {
            var userId = checkParam(req.body, "userId")
            var thingId = checkParam(req.body, "thingId");
            var thing = utils.getThingFromId(thingId);
            if(thing != 3) {
                throw "you can't delete this";
            }
        } catch(e) {
            res.status(400);
            res.end(e.message);
            return;
        }

    });

    app.post("/api/publish", function(req, res) {
        try {
            var suggestionId = parseInt(checkParam(req.body, "suggestionId"), 36);
            var userId = checkParam(req.body, "userId");
            if(suggestionId == NaN) {
                throw "incorrect suggestionId";
            } else if(userId == NaN) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400);
            res.end(e.message);
            return;
        }
        mysqlConnection.query("SELECT id, author FROM suggestions WHERE id = ?", [suggestionId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("this suggestion doesn't exist");
                return;
            }
            if(rows[0].author != userId) {
                res.status(403);
                res.end("this suggestion is private and you are not the author");
                return;
            }
            mysqlConnection.query("UPDATE suggestions SET published = 1 WHERE id = ?", [suggestionId], function(err, rows, fields) {
                if(err) throw err;
                //check rows?
                res.status(200);
                res.end();
                return;
            });
        });
    });

    app.get("/api/profile", function(req, res) {
        try {
            var userId = parseInt(checkParam(req.query, "userId"), 36);
            if(userId == NaN) {
                throw "incorrect userId";
            }
        } catch(e) {
            res.status(400);
            res.end(e.message);
            return;
        }
        mysqlConnection.query("SELECT id, name, TIMESTAMPDIFF(SECOND, timeRegistered, CURRENT_TIMESTAMP) AS timeSinceRegistered FROM users WHERE id = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length != 1) {
                res.status(404);
                res.end("this user doesn't exist");
                return;
            }
            var profileData = rows[0];
            profileData.timeSinceRegistered = utils.formatProfileTime(profileData.timeSinceRegistered);
            res.json(profileData);
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
