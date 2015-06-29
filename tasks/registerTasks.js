module.exports = function (grunt) {
	grunt.registerTask("test", ["mochaTest"]);
	grunt.registerTask("hint", ["jscs", "jshint"]);
	grunt.registerTask("check", ["hint", "test"]);
};
