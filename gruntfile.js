module.exports = function (grunt) {
	var pathHelper = require("path"),
		path = "./tasks/options/",
		glob = require("glob"),
		config = {};

	require("load-grunt-tasks")(grunt);

	glob.sync("*.js", {
			cwd: path
		})
		.forEach(function (option) {
			var key = option.replace(/\.js$/, "");

			config[key] = require(path + option);
		});

	grunt.initConfig(config);
	grunt.loadTasks("tasks");
};
