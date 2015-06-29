module.exports = {
	console: {
		options: {
			jshintrc: true,
			reporter: require("jshint-stylish")
		},
		src: [
			"./src/**/*.js",
			"./tests/**/*.js",
			"./tasks/**/*.js"
		]
	}
};
