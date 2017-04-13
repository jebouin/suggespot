const schedule = require("node-schedule");
const colors = require("colors/safe");
const logs = require("./logs");

module.exports = function(mysqlPool) {
    
    function getNextDigestTime() {
        var time = new Date();
        time.setDate(time.getDate() + 1);
        time.setHours(14);
        time.setMinutes(0);
        time.setSeconds(0);
        time.setMilliseconds(0);
        time.setSeconds(Math.floor(Math.random() * 300));
        return time;
    }
    
    function sendDigest(userId) {
        mysqlPool.query("SELECT name FROM users WHERE id = ?", [userId], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length === 0) {
                throw new Error("user not found");
            }
            var user = rows[0];
            logs.log("Digest sent to " + colors.bold(user.name));
            setNextDigestTime(userId);
        });
    } 

    function setNextDigestTime(userId) {
        var time = getNextDigestTime();
        var timestamp = Math.floor(time.getTime() / 1000);
        mysqlPool.query("UPDATE users SET nextDigest = FROM_UNIXTIME(?) WHERE id = ?", [timestamp, userId], function(err, rows, fields) {
            if(err) throw err;
            var job = schedule.scheduleJob(time, sendDigest.bind(null, userId));
        });
    }

    function init(callback) {
        logs.log("Scheduling digests...");
        mysqlPool.query("SELECT id, nextDigest FROM users", [], function(err, rows, fields) {
            if(err) throw err;
            rows.forEach(function(row) {
                var time = row.nextDigest;
                if(time < new Date()) {
                    sendDigest(row.id);
                } else {
                    var job = schedule.scheduleJob(time, sendDigest.bind(null, row.id));
                }
            });
            logs.log("Digests scheduled");
            callback();
        });
    }

    return {init: init};
};
