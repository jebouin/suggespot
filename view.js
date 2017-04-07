const jade = require("pug");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

module.exports = function(app) {

    function getTemplate(name) {
        var template;
        //remove in production
        var recompile = true;
        if(recompile === true) {
            template = jade.compileFile("view/" + name + ".pug");
        } else {
            template = templates[name];
        }
        return template;
    }

    var templates = {};
    var files = fs.readdirSync("view");
    for(var i=0; i<files.length; i++) {
        var file = files[i];
        var filePath = "view/" + file;
        var stat = fs.lstatSync(filePath);
        if(!stat.isDirectory() && path.extname(file) === ".pug") {
            var name = path.basename(file, ".pug");
            var template = jade.compileFile(filePath);
            templates[name] = template;
        }
    }

    return {
        templates: templates,
        getTemplate: getTemplate,
    };
};
