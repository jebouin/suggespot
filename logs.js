utils = require("./utils.js");
colors = require("colors/safe");
fs = require("fs");
module.exports = {
	log: function(msg) {
		var date = utils.formatDate();
		console.log(colors.dim(date) + " " + msg);
		var toWrite = date + " " + msg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') + "\n";
		if(this.stream) {
			this.stream.write(toWrite);
		} else {
			this.stream = fs.createWriteStream("logs/log.txt", {flags: "a"});
			this.stream.once("open", function() {
				this.write(toWrite);
			});
		}
	},
	close: function() {
		this.stream.end();
	}
};