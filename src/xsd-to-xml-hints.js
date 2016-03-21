var fs = require("fs"),
	Parser = require("./parser"),
	args = process.argv.slice(2),
	parseString = require("xml2js").parseString;

function parseXsd(pathToXsd, pathToJson) {

	if (!pathToXsd && args.length <= 0) {
		console.log("Usage: node xsdtoxmlhits <path to xsd file>");
		process.exit(2);
	}

	fs.readFile(pathToXsd || args[0], function (err, xml) {
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

			var jsonResult = JSON.stringify(result);

			if (pathToJson){
				var outJson = fs.createWriteStream(pathToJson);
				outJson.write(jsonResult);
			} else {
				console.log(jsonResult);
			}

		});
	});
}

module.exports = parseXsd;
