var expect = require("chai").expect,
	fs = require("fs"),
	Parser = require("../src/parser.js"),
	parseString = require("xml2js").parseString;

function readSources(xsdSource, resultSource, callback) {
	fs.readFile(xsdSource, "utf8", function (err, xmlString) {
		if (err) {
			callback(err);
		}

		fs.readFile(resultSource, "utf8", function (err, jsonString) {
			if (err) {
				callback(err);
			}

			parseString(xmlString, function (err, xmlJson) {
				if (err) {
					callback(err);
				}

				callback(null, xmlJson, JSON.parse(jsonString));
			});
		});
	});
}

function testParser(xsdPath, jsonPath, done) {
	readSources(xsdPath, jsonPath, function (err, xml, json) {
		var result,
			parser;

		if (err) {
			done(err);

			return;
		}

		parser = new Parser(xml);
		result = parser.parse();

		expect(result).to.deep.equal(json);
		done();
	});
}

describe("Parse", function () {
	it("one-element-with-attributes", function (done) {
		testParser("./tests/test-files/one-element-with-attributes.xsd",
			"./tests/test-files/one-element-with-attributes.json", done);
	});

	it("two-cycle-elements-reference", function (done) {
		testParser("./tests/test-files/two-cycle-elements-reference.xsd",
			"./tests/test-files/two-cycle-elements-reference.json", done);
	});

	it("cycle-element-reference", function (done) {
		testParser("./tests/test-files/cycle-element-reference.xsd",
			"./tests/test-files/cycle-element-reference.json", done);
	});

	it("cycled-nested-elements", function (done) {
		testParser("./tests/test-files/cycled-nested-elements.xsd",
			"./tests/test-files/cycled-nested-elements.json", done);
	});

	it("full-scheme", function (done) {
		testParser("./tests/test-files/full-scheme.xsd",
			"./tests/test-files/full-scheme.json", done);
	});
});
