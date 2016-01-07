var _ = require("lodash"),
	debug = require("debug"),
	debugElement = debug("element"),
	debugComplexType = debug("complexType"),
	debugSimpleType = debug("supleType"),
	debugElementGroup = debug("elementGroup"),
	debugAttributesGroup = debug("attributesGroup"),
	consts = {};

consts = {
	schemaPrefix: "xs:",
	rootElementType: "schema",
	attributesKey: "$",
	nodes: {
		element: "element",
		simpleType: "simpleType",
		complexType: "complexType",
		complexContent: "complexContent",
		extension: "extension",
		attribute: "attribute",
		restriction: "restriction",
		union: "union",
		pattern: "pattern",
		whiteSpace: "whiteSpace",
		enumeration: "enumeration",
		attributeGroup: "attributeGroup",
		choice: "choice",
		all: "all",
		sequence: "sequence",
		group: "group",
		any: "any"
	}
};

function Parser(json, schemaPrefix, rootElementType) {
	this.rootElementType = rootElementType || consts.rootElementType;
	this.schemaPrefix = schemaPrefix || consts.schemaPrefix;
	this.schemaPrefixRegex = new RegExp(this.schemaPrefix, "gi");
	this.rootElement = json[this._buildNodeTypeString(this.rootElementType)] || {};
}

Parser.prototype = {
	_simpleTypesCache: {},
	_complexTypesCache: {},
	_elementsGroupsCache: {},
	_attributesGroupsCache: {},
	_allElementsCache: {},
	_rootElementsCache: [],
	_walkedElements: [],

	parse: function (json) {
		var that = this,
			elements = this._getNodesCollection(consts.nodes.element);

		this._simpleTypesCache = {};
		this._complexTypesCache = {};
		this._elementsGroupsCache = {};
		this._attributesGroupsCache = {};
		this._allElementsCache = {};
		this._rootElementsCache = [];
		this._walkedElements = [];

		_.forEach(elements, function (item) {
			var name = that._getNodeName(item);

			that._rootElementsCache.push(name);
			that._parseElement(item);
		});

		return this._getFlatElements();
	},

	_parseElement: function (node) {
		var nodesList,
			elementType,
			attributes = this._getNodeAttributes(node);

		debugElement("Parse:" + JSON.stringify(attributes));

		if (!attributes.name) {
			throw new Error("Missing element name.");
		}

		if (this._allElementsCache[attributes.name]) {
			return "ref";
		}

		//anticycling ckeck
		if (this._walkedElements.indexOf(attributes.name) >= 0) {
			return "cycle";
		}

		this._walkedElements.push(attributes.name);

		if (attributes.type) {
			elementType = this._parseComplexType(attributes.type);
		}

		nodesList = this._getChildrenByNodeType(node, consts.nodes.complexType);

		if (nodesList.length === 1) {
			elementType = this._parseComplexType(null, nodesList[0]);
		}

		if (!elementType) {
			throw new Error("Invalid element \"" + attributes.name + "\"");
		}

		this._allElementsCache[attributes.name] = elementType;

		return elementType;
	},

	_parseComplexType: function (nodeName, node) {
		var nodesList,
			result = {};

		debugComplexType("Parse: name=" + nodeName);

		if (!nodeName && !node) {
			throw new Error("Missing complex type name and node.");
		}

		if (nodeName && this._complexTypesCache[nodeName]) {
			return this._complexTypesCache[nodeName];
		}

		if (!node) {
			nodesList = this._getNodesCollection(consts.nodes.complexType);
			node = this._getChildByNodeName(nodesList, nodeName);
		}

		if (node) {
			this._walkComplexType(consts.nodes.complexType, node, result);
		}

		return result;
	},

	_walkComplexType: function (currentNodeType, currentNode, result) {
		var that = this,
			extensionType,
			attributes = this._getNodeAttributes(currentNode);

		debugComplexType("Walk:" + JSON.stringify(attributes));
		if (currentNodeType === consts.nodes.any) {
			result.children = result.children || {};
		} else if (currentNodeType === consts.nodes.complexContent ||
			currentNodeType === consts.nodes.complexType ||
			currentNodeType === consts.nodes.sequence ||
			currentNodeType === consts.nodes.all ||
			currentNodeType === consts.nodes.choice) {

			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkComplexType(childNodeType, childNode, result);
			});
		} else if (currentNodeType === consts.nodes.extension) {
			extensionType = this._parseComplexType(attributes.base);
			result = _.merge(result, extensionType);

			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkComplexType(childNodeType, childNode, result);
			});
		} else if (currentNodeType === consts.nodes.attribute) {
			result.attr = result.attr || {};
			result.attr[attributes.name] = this._parseSimpleType(attributes.type);
		} else if (currentNodeType === consts.nodes.attributeGroup) {
			_.forEach(this._parseAttributesGroup(attributes.ref).attr, function (value, name) {
				result.attr = result.attr || {};
				result.attr[name] = result.attr[name] || {};
				result.attr[name] = _.merge(result.attr[name], value);
			});
		} else if (currentNodeType === consts.nodes.group) {
			_.forEach(this._parseElementsGroup(attributes.ref), function (value, name) {
				result[name] = result[name] || {};
				result[name] = _.merge(result[name], value);
			});
		} else if (currentNodeType === consts.nodes.element) {
			result.children = result.children || {};
			result.children[attributes.name] = this._parseElement(currentNode);
		} else {
			throw new Error("Unhandled complex type node \"" + currentNodeType + "\"");
		}
	},

	_parseSimpleType: function (nodeName) {
		var node,
			nodesList,
			result = {};

		debugSimpleType("Parse: name=" + nodeName);

		if (this._simpleTypesCache[nodeName]) {
			return this._simpleTypesCache[nodeName];
		}

		nodesList = this._getNodesCollection(consts.nodes.simpleType);
		node = this._getChildByNodeName(nodesList, nodeName);

		if (node) {
			this._walkSimpleType(consts.nodes.simpleType, node, result);
		}

		return result;
	},

	_walkSimpleType: function (currentNodeType, currentNode, result) {
		var that = this,
			unionType,
			attributes = this._getNodeAttributes(currentNode);

		debugSimpleType("Walk:" + JSON.stringify(attributes));

		if (currentNodeType === consts.nodes.restriction || currentNodeType === consts.nodes.simpleType) {
			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkSimpleType(childNodeType, childNode, result);
			});
		} else if (currentNodeType === consts.nodes.union) {
			unionType = this._parseSimpleType(attributes.memberTypes);
			result = _.merge(result, unionType);

			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkSimpleType(childNodeType, childNode, result);
			});
		} else if (currentNodeType === consts.nodes.enumeration) {
			result.enum = result.enum || [];
			result.enum.push(attributes.value);
		} else if (currentNodeType === consts.nodes.pattern || currentNodeType === consts.nodes.whiteSpace) {
			return;
		} else {
			throw new Error("Unhandled simple type node + \"" + currentNodeType + "\"");
		}
	},

	_parseElementsGroup: function (nodeName) {
		var node,
			nodesList,
			result = {};

		debugElementGroup("Parse: name=" + nodeName);

		if (this._elementsGroupsCache[nodeName]) {
			return this._elementsGroupsCache[nodeName];
		}

		nodesList = this._getNodesCollection(consts.nodes.group);
		node = this._getChildByNodeName(nodesList, nodeName);

		if (node) {
			this._walkElementsGroup(consts.nodes.group, node, result);
		}

		return result;
	},

	_walkElementsGroup: function (currentNodeType, currentNode, result) {
		var that = this,
			unionType,
			attributes = this._getNodeAttributes(currentNode);

		debugElementGroup("Walk:" + JSON.stringify(attributes));

		if (currentNodeType === consts.nodes.group) {
			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkElementsGroup(childNodeType, childNode, result);
			});
		} else if (currentNodeType === consts.nodes.choice) {
			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkComplexType(childNodeType, childNode, result);
			});
		} else {
			throw new Error("Unhandled elements group node + \"" + currentNodeType + "\"");
		}
	},

	_parseAttributesGroup: function (nodeName) {
		var node,
			nodesList,
			result = {};

		debugAttributesGroup("Parse: name=" + nodeName);

		if (this._attributesGroupsCache[nodeName]) {
			return this._attributesGroupsCache[nodeName];
		}

		nodesList = this._getNodesCollection(consts.nodes.attributeGroup);
		node = this._getChildByNodeName(nodesList, nodeName);
		this._walkAttributesGroup(consts.nodes.attributeGroup, node, result);

		return result;
	},

	_walkAttributesGroup: function (currentNodeType, currentNode, result) {
		var that = this,
			unionType,
			attributes = this._getNodeAttributes(currentNode);

		debugAttributesGroup("Walk:" + JSON.stringify(attributes));

		if (currentNodeType === consts.nodes.attributeGroup) {
			this._loopOnChildren(currentNode, function (childNodeType, childNode) {
				that._walkComplexType(childNodeType, childNode, result);
			});
		} else {
			throw new Error("Unhandled attributes group node + \"" + currentNodeType + "\"");
		}
	},

	_getNodesCollection: function (collectionName) {
		var elementsNodeType = this._buildNodeTypeString(collectionName);

		return this.rootElement[elementsNodeType] || [];
	},

	_getNodeName: function (node) {
		return this._getNodeAttributes(node).name || "";
	},

	_getNodeAttributes: function (node) {
		return node[consts.attributesKey] || {};
	},

	_parseNodeTypeString: function (nodeTyoe) {
		return nodeTyoe.replace(this.schemaPrefixRegex, "");
	},

	_buildNodeTypeString: function (nodeType) {
		return this.schemaPrefix + nodeType;
	},

	_getChildByNodeName: function (nodesList, nodeName) {
		var that = this,
			node;

		node = _.filter(nodesList, function (node) {
			return that._getNodeName(node) === nodeName;
		});

		if (node) {
			return node[0];
		} else {
			return null;
		}
	},

	_getChildrenByNodeType: function (parentNode, nodeType) {
		var nodesList = [];

		this._loopOnChildren(parentNode, function (childNodeType, childNode) {
			if (childNodeType === nodeType) {
				nodesList.push(childNode);
			}
		});

		return nodesList;
	},

	_loopOnChildren: function (parentNode, callback, type) {
		var that = this;

		_.forEach(parentNode, function (value, key) {
			var nodeType = that._parseNodeTypeString(key);

			if (key === consts.attributesKey) {
				return;
			}

			if (type && type !== nodeType) {
				return;
			}

			if (_.isArray(value)) {
				_.forEach(value, function (item) {
					callback(nodeType, item);
				});
			} else {
				callback(nodeType, value);
			}
		});
	},

	_getFlatElements: function () {
		var that = this,
			result = {};

		result["!top"] = this._rootElementsCache;

		_.forEach(this._allElementsCache, function (value, key) {
			result[key] = {
				attrs: that._getFlatAttributes(value.attr),
				children: that._getFlatChildren(value.children)
			};
		});

		return result;
	},

	_getFlatChildren: function (children) {
		var result = [];

		_.forEach(children || [], function (value, key) {
			result.push(key);
		});

		return result;
	},

	_getFlatAttributes: function (attributes) {
		var result = {};

		_.forEach(attributes || {}, function (value, key) {
			result[key] = value.enum || null;
		});

		return result;
	}
};

module.exports = Parser;
