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
	},
	getThingFromID: function(id) {
		id = id.toString();
		var pos = id.indexOf("_");
		if(pos < 1) {
			throw "Invalid thing id";
		}
		var thingType = parseInt(id.substring(0, pos), 36);
		var thingID = parseInt(id.substring(pos + 1), 36);
		if(thingType < 0 || thingType > 1) {
			throw "Thing type out of bounds";
		}
		return {type: thingType, id: thingID};
	},
	voteDirToField: function(dir) {
		if(dir == -1) {
			return "downvotes";
		} else if(dir == 1) {
			return "upvotes";
		}
		return "cancels";
	}
};
