module.exports = {
	inline: {
		src: [
			"./src/**/*.js",
			"./tests/**/*.js",
			"./tasks/**/*.js"
		],
		options: {
			config: "./.jscsrc",
			reporter: "inline"
		}
	}
};
