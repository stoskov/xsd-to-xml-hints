var fs = require("fs"),
	Parser = require("./parser"),
	args = process.argv.slice(2),
	parseString = require("xml2js").parseString;

function parseXsd(pathToXsd) {

	console.log(pathToXsd);

	if (!pathToXsd) {
		console.log("Usage: node xsdtoxmlhits <path to xsd file>");
		process.exit(2);
	}

	fs.readFile(pathToXsd, function (err, xml) {
		if (err) {
			console.log(err);
			process.exit(2);
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
}

module.exports = parseXsd;
