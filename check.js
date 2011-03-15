#!/usr/bin/env node

var parser = require("./parse-js");
var fs = require("fs");

var files = process.argv.slice(2);

function buildBody(ea) {
	if (typeof ea === 'undefined' || ea == null) {
		return null;
	}
	var constructor = nodeMap[ea[0]];
	if (typeof constructor === 'undefined') {
		console.log(ea);
		console.log(ea[0]);
		throw "Can't find: " + ea[0];
	}
	return new constructor(ea);
};

var TopLevelNode = function (array) {
	var self = this;
	var rest = array.slice(1);

	self.nodeName = "TopLevel";
	self.nodes = rest[0].map(buildBody);

	return self;
};

var FunctionNode = function (array) {
	var self = this;

	self.nodeName = "function";
	self.fn = array[1];
	self.arguments = array[2];
	var rest = array.slice(3);
	self.body = rest[0].map(buildBody);


	return self;
};

var ReturnNode = function (array) {
	var self = this;
	self.nodeName = "return";
	var rest = array.slice(1)[0];

	self.body = buildBody(rest);

	return self;
}

var VarNode = function (array) {
	var self = this;

	self.nodeName = "var";
	self.assigns = array.slice(1).map(function (ea) { new AssignmentNode(ea) });

	return self;
};

var AssignmentNode = function (array) {
	var self = this;
	self.nodeName = "assignment";
	self.name = array[0][0];

	if (array[0][1]) {
		self.body = buildBody(array[0][1]);
	} else {
		self.body = [];
	}
	return self;
};

var StatNode = function (array) {
	var self = this;

	self.nodeName = "stat";

	self.body = buildBody(array[1]);

	return self;
};

var ValueNode = function (array) {
	var self = this;

	self.type = array[0];
	self.value = array[1];

	return self;
};

var BinaryNode = function (array) {
	var self = this;
	self.nodeName = "binary";

	self.operator = array[1];
	self.lhs = buildBody(array[2]);
	self.rhs = buildBody(array[3]);

	return self;
};

var ArrayNode = function (array) {
	var self = this;
	self.nodeName = "array";

	self.elements = array[1].map(buildBody);

	return self;
};

var CallNode = function (array) {
	var self = this;

	self.nodeName = "call";
	self.callee = buildBody(array[1]);
	self.arguments = array[2].map(buildBody);

	return self;
}

var RegexNode = function (array) {
	var self = this;

	self.nodeName = "regex";

	self.string = array[1];
	self.modifiers = array[2];

	return self;
};

var ObjectNode = function (array) {
	var self = this;
	self.nodeName = "object";

	self.nodes = array[1].map(function (ea) { new KeyValueNode(ea); });

	return self;
};

var KeyValueNode = function(array) {
	var self = this;
	self.key = array[0];
	self.value = buildBody(array[1]);

	return self;
};

var BlockNode = function(array) {
	var self = this;
	self.nodeName = "block";
	self.body = (array[1] || []).map(buildBody);

	return self;
};

var IfNode = function(array) {
	var self = this;
	self.nodeName = "if";

	self.condition = buildBody(array[1]);
	self.body = buildBody(array[2]);
	return self;
};

var AssignNode = function(array) {
	var self = this;
	self.nodeName = "assign";

	self.operator = array[1];
	self.name = buildBody(array[2]);
	self.value = buildBody(array[3]);
	return self;
};

var UnaryPostfixNode = function(array) {
	var self = this;
	self.nodeName = "unary postfix";

	self.operator = array[1];
	self.name = buildBody(array[2]);
	return self;
};

var UnaryPrefixNode = function(array) {
	var self = this;
	self.nodeName = "unary postfix";

	self.operator = array[1];
	self.name = buildBody(array[2]);

	return self;
};

var NewNode = function(array) {
	var self = this;
	self.nodeName = "new";
	self.fn = buildBody(array[1]);
	self.arguments = array[2].map(buildBody);

	return self;
};

var DotNode = function(array) {
	var self = this;
	self.nodeName = array[0];
	self.body = buildBody(array[1]);
	self.accessor = array[2];

	return self;
};

var TryNode = function(array) {
	var self = this;
	self.nodeName = "try";
	self.body = array[1].map(buildBody);
	self.exception = buildBody(array[2]);
	self.finally = (array[3] || []).map(buildBody);
	return self;
};

var ExceptionNode = function(array) {
	var self = this;
	self.nodeName = "exception";
	self.block = array[1].map(buildBody);

	return self;
};

var ThrowNode = function(array) {
	var self = this;

	self.nodeName = "throw";
	self.body = buildBody(array[1]);

	return self;
};

var WhileNode = function(array) {
	var self = this;

	self.nodeName = "while";
	self.condition = buildBody(array[1]);
	self.body = buildBody(array[2]);

	return self;
};

var SwitchNode = function(array) {
	var self = this;
	self.nodeName = "switch";

	self.value = buildBody(array[1]);
	self.cases = array[2].map(function (ea) { return new CaseNode(ea); });
	return self;
};

var CaseNode = function(array) {
	var self = this;
	self.nodeName = "case";
	if (array[0]) {
		self.value = buildBody(array[0]);
	} else {
		self.value = "default";
	}
	self.body = array[1].map(buildBody);

	return self;
};

var ForNode = function(array) {
	var self = this;
	self.nodeName = "for";

	self.initializer = buildBody(array[1]);
	self.condition = buildBody(array[2]);
	self.expression = buildBody(array[3]);
	self.body = buildBody(array[4]);

	return self;
};

var SequenceNode = function(array) {
	var self = this;

	self.nodeName = "sequence";
	self.body = array.slice(1).map(buildBody);

	return self;
};

var TernaryNode = function(array) {
	var self = this;
	self.nodeName = "ternary";

	self.condition = buildBody(array[1]);
	self.ifTrue = buildBody(array[2]);
	self.ifFalse = buildBody(array[3]);

	return self;
};

var BreakNode = function(array) {
	var self = this;
	self.nodeName = "break";
	self.body = buildBody(array[1]);

	return self;
};

var nodeMap = {
	var: VarNode,
	defun: FunctionNode,
	function: FunctionNode,
	stat: StatNode,
	toplevel: TopLevelNode,
	return: ReturnNode,
	num: ValueNode,
	string: ValueNode,
	binary: BinaryNode,
	name: ValueNode,
	array: ArrayNode,
	call: CallNode,
	regexp: RegexNode,
	object: ObjectNode,
	block: BlockNode,
	if: IfNode,
	assign: AssignNode,
	'unary-postfix': UnaryPostfixNode,
	'unary-prefix': UnaryPrefixNode,
	new: NewNode,
	dot: DotNode,
	try: TryNode,
	ex: ExceptionNode,
	throw: ThrowNode,
	while: WhileNode,
	switch: SwitchNode,
	for: ForNode,
	seq: SequenceNode,
	conditional: TernaryNode,
	sub: DotNode,
	break: BreakNode
};

function buildNodes(data) {
	var ast = parser.parse(data);
	var constructor = nodeMap[ast[0]];
	return new constructor(ast);
};

files.forEach(function (file) {
		fs.readFile(file, 'utf-8', function(err, data) {
			console.log(buildNodes(data));
		});
});