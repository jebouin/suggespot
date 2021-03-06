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
    formatProfileTime: function(seconds) {
        if(seconds < 3) return "";
        var timesInSecond = [31556926, 2628288, 604800, 86400, 3600, 60, 1];
        var timeStrings = ["year", "month", "week", "day", "hour", "minute", "second"];
        var i = 0, a = 0, b = 0;
        while(seconds > 0) {
            var n = Math.floor(seconds / timesInSecond[i]);
            seconds -= n * timesInSecond[i];
            if(n > 0) {
                var str = n.toString() + " " + timeStrings[i] + (n == 1 ? "" : "s");
                if(a === 0) a = str;
                else if(b === 0) b = str;
            }
            i++;
        }
        return (b === 0 ? a : a + " and " + b);
    },
	getSalt: function() {
		return crypto.randomBytes(16).toString('base64');
	},
	getMonthsFromNow: function(n) {
		return new Date(Date.now() + 2592000000);
	},
	sendFile: function(res, url) {
		res.sendFile(url, {root: __dirname});
	},
	getUrlWithParameters: function(url, params) {
		var f = true;
		for(var p in params) {
			url += (f ? "?" : "&") + p + "=" + params[p];
			f = false;
		}
		return url;
	},
	getThingFromId: function(id) {
		id = id.toString();
		var pos = id.indexOf("_");
		if(pos < 1) {
			throw "invalid thing id";
		}
		var thingType = parseInt(id.substring(0, pos), 36);
		var thingId = parseInt(id.substring(pos + 1), 36);
		//0 = suggestion
		//1 = comment
        //2 = user
        //3 = photo
        //4 = tag
		if(thingType < 0 || thingType > 4) {
			throw "thing type out of bounds";
		}
		return {type: thingType, id: thingId};
	},
    thingTypeToString: function(type) {
        if(type < 0 || type > 4) {
            throw "thing type out of bounds";
        }
        return ["suggestion", "comment", "user", "photo", "tag"][type];
    },
    thingTypeToTableName: function(type) {
        return thingTypeToString(type) + "s";
    },
    checkParam: function(params, toCheck) {
        var param = params[toCheck];
        if(typeof param === "undefined" || param === null) {
            throw new Error("parameter " + toCheck + " is missing");
        }
        return param; 
    },
	fileExtension: function(fileName) {
		return ("." + fileName.split('.').pop()).toLowerCase();
	},
    mimetypeExtension: function(mime) {
        return {"image/png": ".png",
                "image/jpeg": ".jpg",
                "image/pjpeg": ".jpeg",
                "image/gif": ".gif",
                "image/bmp": ".bmp",
                "image/x-windows-bmp": ".bmp"}[mime];
    },
	voteDirToField: function(dir) {
		if(dir == -1) {
			return "downvotes";
		} else if(dir == 1) {
			return "upvotes";
		}
		return "cancels";
	},
	removeDuplicates: function(arr) {
		var seen = {};
		return arr.filter(function(e) {
			return seen.hasOwnProperty(e) ? false : (seen[e] = true);
		});
	},
    separateEmail: function(email) {
        var match = /^(?=[A-Z0-9][A-Z0-9@._%+-]{5,253}$)[A-Z0-9._%+-]{1,64}@(?:(?=[A-Z0-9-]{1,63}\.)[A-Z0-9]+(?:-[A-Z0-9]+)*\.){1,8}[A-Z]{2,63}$/i.exec(email);
        if(match === null) {
            return null;
        }
        var atPos = email.indexOf("@");
        return {local: email.substr(0, atPos), domain: email.substr(atPos + 1)};
    },
    randInt: function(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
};
