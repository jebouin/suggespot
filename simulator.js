module.exports = function(mysqlPool, api) {
    function createTestUsers(n) {
        console.log("Creating " + n + " new users");
        mysqlPool.query("SELECT id, name FROM users WHERE name LIKE 'TEST%'", [], function(err, rows, fields) {
            if(err) throw err;
            var start = 0;
            if(rows.length > 0) {
                rows.forEach(function(row) {
                    var nn = parseInt(row.name.substr(4));
                    if(nn > start) {
                        start = nn;
                    }
                });
            }
            start++;
            for(var i = 0; i < n; i++) {
                var name = "test" + (start + i);
                auth.createUser(name, name, name, function(err) {

                });
            }
        });
    }

    function simulate() {
        //createTestUsers(82);
        mysqlPool.query("SELECT id FROM users WHERE name LIKE 'TEST%'", [], function(err, rows, fields) {
            if(err) throw err;
            var userCount = rows.length;
            if(userCount === 0) {
                return;
            }
            //1 minute per user
            var voteRate = 60000 / userCount; 
            function vote() {
                var nextTime = voteRate * (1 + Math.random() - .5);
                mysqlPool.query("SELECT id FROM users WHERE name LIKE 'TEST%'", [], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length === 0) {
                        return;
                    }
                    var id = rows[utils.randInt(0, rows.length)].id;
                    randomVote(id);
                    setTimeout(vote, nextTime);
                });
            }
            vote();
            //5 minutes per user
            var commentRate = 300000 / userCount;
            function comment() {
                var nextTime = commentRate * (1 + Math.random() - .5);
                mysqlPool.query("SELECT id FROM users WHERE name LIKE 'TEST%'", [], function(err, rows, fields) {
                    if(err) throw err;
                    if(rows.length === 0) {
                        return;
                    }
                    var id = rows[utils.randInt(0, rows.length)].id;
                    randomComment(id);
                    setTimeout(comment, nextTime);
                });
            }
            comment();
        });
    }

    function randomVote(user) {
        if(Math.random() < .2) {
            mysqlPool.query("SELECT entityId FROM suggestions", [], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length === 0) {
                    return;
                }
                var entityId = rows[utils.randInt(0, rows.length)].entityId;
                var thingId = "0_" + entityId.toString(36);
                randomVoteThing(user, thingId);
            });
        } else {
            mysqlPool.query("SELECT entityId FROM comments", [], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length === 0) {
                    return;
                }
                var entityId = rows[utils.randInt(0, rows.length)].entityId;
                var thingId = "1_" + entityId.toString(36);
                randomVoteThing(user, thingId);
            });
        }
    }

    function randomVoteThing(user, thingId) {
        var dir = utils.randInt(0, 4) === 0 ? -1 : 1;
        var json = {thingId: thingId, userId: user.toString(36), dir: dir};
        api.makeLocalAPICall("POST", "/api/vote", json, function(err, res) {

        });
    }

    function randomComment(user) {
        mysqlPool.query("SELECT entityId FROM suggestions", [], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length === 0) {
                return;
            }
            var entityId = rows[utils.randInt(0, rows.length)].entityId;
            randomCommentSuggestion(user, entityId);
        });
    }

    function randomCommentSuggestion(user, suggestionId) {
        var content = "";
        var n = utils.randInt(4, 100);
        for(var i = 0; i < n; i++) {
            content += Math.random(36).toString(36).substr(2, utils.randInt(2, 10)) + " ";
        }
        var json = {userId: user.toString(36), suggestionId: suggestionId.toString(36), content: content};
        function sendComment() {
            api.makeLocalAPICall("POST", "/api/comment", json, function(err, res) {

            });
        }
        if(Math.random() < .2) {
            mysqlPool.query("SELECT id FROM commentThreads WHERE suggestion = ?", [suggestionId], function(err, rows, fields) {
                if(err) throw err;
                if(rows.length === 0) {
                    sendComment();
                } else {
                    var threadId = rows[utils.randInt(0, rows.length)].id;
                    json.thread = threadId.toString(36);
                    sendComment();
                    console.log("sent a reply");
                }
            });
        } else {
            sendComment();
        }
    }

    return {
        simulate: simulate
    };
};
