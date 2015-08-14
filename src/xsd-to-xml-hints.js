var fs = require("fs"),
	Parser = require("./parser"),
	args = process.argv.slice(2),
	parseString = require("xml2js").parseString;

if (args.length <= 0) {
	console.log("Usage: node xsdtoxmlhits <path to xsd file>");
	exit();
}

fs.readFile(args[0], function (err, xml) {
	if (err) {
		console.log(err);
		exit();
	}

	parseString(xml, function (err, json) {
		var result,
			parser;

		if (err) {
			console.log(err);
			exit();
		}

		parser = new Parser(json);
		result = parser.parse();

		console.log(JSON.stringify(result));
	});
});
