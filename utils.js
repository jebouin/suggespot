const crypto = require("crypto");
const logs = require("./logs");
module.exports = {
	padString: function(str, char, length) {
		while(str.length < length) {
			str = char + str;
		}
		return str;
	},
	formatDate: function(date) {
		if(!date) {
			date = new Date();
		}
		var year = this.padString("" + (date.getFullYear() % 100), "0", 2);
		var month = this.padString("" + (date.getMonth() + 1), "0", 2);
		var day = this.padString("" + date.getDate(), "0", 2);
		var hour = this.padString("" + date.getHours(), "0", 2);
		var minutes = this.padString("" + date.getMinutes(), "0", 2);
		var seconds = this.padString("" + date.getSeconds(), "0", 2);
		return year + "/" + month + "/" + day + " " + hour + ":" + minutes + ":" + seconds;
	},
	getSalt: function() {
		return crypto.randomBytes(16).toString('base64');
	},
	getMonthsFromNow: function(n) {
		return new Date(Date.now() + 2592000000);
	},
	sendFile: function(res, url) {
		res.sendFile(url, {root: global.rootDir});
	},
	getUrlWithParameters: function(url, params) {
		var f = true;
		for(p in params) {
			url += (f ? "?" : "&") + p + "=" + params[p];
			f = false;
		}
		return url;
	}
};
