const fs = require("fs");
const colors = require("colors/safe");
const logs = require("./logs");

module.exports = function(app, mysqlPool) {
    function cleanPhotos(onDone) {
        logs.log("cleaning photos");
        var dir = __dirname + global.config.uploadDir;
        fs.readdir(dir, function(err, files) {
            var toProcess = files.length;
            var processed = 0, deleted = 0;
            files.forEach(function(file) {
                fs.stat(dir + "/" + file, function(err, stats) {
                    function onProcessed() {
                        processed++;
                        if(processed >= toProcess) {
                            logs.log("processed " + colors.bold(processed.toString()) + " files, deleted " + colors.bold(deleted.toString()));
                            onDone();
                        }
                    }
                    if(stats.isDirectory()) {
                        onProcessed();
                    } else {
                        mysqlPool.query("SELECT id FROM photos WHERE path = ?", [global.config.uploadDir + "/" + file], function(err, rows, fields) {
                            if(err) throw err;
                            if(rows.length === 0) {
                                fs.unlinkSync(dir + "/" + file);
                                deleted++;
                            } else if(rows.length > 1) {
                                //todo?
                            }
                            onProcessed();
                        });
                    }
                });
            });
        });
    }

    function cleanDB(onDone) {
        logs.log("cleaning database");
        mysqlPool.query("SELECT id, path FROM photos", [], function(err, rows, fields) {
            if(err) throw err;
            if(rows.length === 0) onDone();
            var toProcess = rows.length;
            var processed = 0, deleted = 0;
            function onProcessed() {
                processed++;
                if(processed >= toProcess) {
                    logs.log("processed " + colors.bold(processed.toString()) + " entries, deleted " + colors.bold(deleted.toString()));
                    onDone();
                }
            }
            function deleteCallback(err, rows, fields) {
                deleted++;
                onProcessed();
            }
            for(var i = 0; i < rows.length; i++) {
                var path = __dirname + rows[i].path;
                if(!fs.existsSync(path)) {
                    mysqlPool.query("DELETE FROM photos WHERE id = ?", [rows[i].id], deleteCallback);
                } else {
                    onProcessed();
                }
            }
        });
    }

    function clean(onDone) {
        logs.log("started cleaning");
        cleanPhotos(function(err) {
            cleanDB(function(err) {
                logs.log("cleaning done");
                onDone();
            });
        });
    }

	return {
		clean: clean
	};
};
