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
    throw "Can't find: " + ea[0];
  }
  return new constructor(ea);
};

var Node = function(name) {
  var self = this;
  self.nodeName = name;
  return self;
};

var NodeCollection = function (array) {
  var self = new Node("nodes");

  self.nodes = array.map(buildBody);

  return self;
};

var TopLevelNode = function (array) {
  var self = new Node("toplevel");
  var rest = array.slice(1);

  self.nodes = new NodeCollection(rest[0]);

  return self;
};

var FunctionNode = function (array) {
  var self = new Node("function");

  self.fn = array[1];
  self.arguments = array[2];

  self.body = new NodeCollection(array.slice(3)[0]);

  return self;
};

var ReturnNode = function (array) {
  var self = new Node("return");

  var rest = array.slice(1)[0];

  self.body = buildBody(rest);

  return self;
}

var VarNode = function (array) {
  var self = new Node("var");

  self.assigns = array.slice(1).map(function (ea) { new AssignmentNode(ea) });

  return self;
};

var AssignmentNode = function (array) {
  var self = new Node("assignment");

  self.name = array[0][0];

  if (array[0][1]) {
    self.body = buildBody(array[0][1]);
  } else {
    self.body = [];
  }
  return self;
};

var StatNode = function (array) {
  var self = new Node("stat");

  self.body = buildBody(array[1]);

  return self;
};

var ValueNode = function (array) {
  var self = new Node("value");

  self.type = array[0];
  self.value = array[1];

  return self;
};

var BinaryNode = function (array) {
  var self = new Node("binary");

  self.operator = array[1];
  self.lhs = buildBody(array[2]);
  self.rhs = buildBody(array[3]);

  return self;
};

var ArrayNode = function (array) {
  var self = new Node("array");

  self.elements = new NodeCollection(array[1]);

  return self;
};

var CallNode = function (array) {
  var self = new Node("call");

  self.callee = buildBody(array[1]);
  self.arguments = new NodeCollection(array[2]);

  return self;
}

var RegexNode = function (array) {
  var self = new Node("regex");

  self.string = array[1];
  self.modifiers = array[2];

  return self;
};

var ObjectNode = function (array) {
  var self = new Node("object");

  self.nodes = array[1].map(function (ea) { new KeyValueNode(ea); });

  return self;
};

var KeyValueNode = function(array) {
  var self = new Node("keyValue");

  self.key = array[0];
  self.value = buildBody(array[1]);

  return self;
};

var BlockNode = function(array) {
  var self = new Node("block");

  self.body = new NodeCollection(array[1] || []);

  return self;
};

var IfNode = function(array) {
  var self = new Node("if");

  self.condition = buildBody(array[1]);
  self.body = buildBody(array[2]);
  return self;
};

var AssignNode = function(array) {
  var self = new Node("assign");

  self.operator = array[1];
  self.name = buildBody(array[2]);
  self.value = buildBody(array[3]);

  return self;
};

var UnaryNode = function(name, array) {
  var self = new Node(name);

  self.operator = array[1];
  self.name = buildBody(array[2]);

  return self;
}

var UnaryPostfixNode = function(array) {
  return new UnaryNode("postfix", array);
};

var UnaryPrefixNode = function(array) {
  return new UnaryNode("prefix", array);
};

var NewNode = function(array) {
  var self = new Node("new");

  self.fn = buildBody(array[1]);
  self.arguments = new NodeCollection(array[2]);

  return self;
};

var DotNode = function(array) {
  var self = new Node(array[0]);

  self.body = buildBody(array[1]);
  self.accessor = array[2];

  return self;
};

var TryNode = function(array) {
  var self = new Node("try");

  self.body = array[1].map(buildBody);
  self.exception = buildBody(array[2]);
  self.finally = new NodeCollection(array[3] || []);
  return self;
};

var ExceptionNode = function(array) {
  var self = new Node("exception");

  self.block = new NodeCollection(array[1]);

  return self;
};

var ThrowNode = function(array) {
  var self = new Node("throw");

  self.body = buildBody(array[1]);

  return self;
};

var WhileNode = function(array) {
  var self = new Node("while");

  self.condition = buildBody(array[1]);
  self.body = buildBody(array[2]);

  return self;
};

var SwitchNode = function(array) {
  var self = new Node("switch");

  self.value = buildBody(array[1]);
  self.cases = array[2].map(function (ea) { return new CaseNode(ea); });
  return self;
};

var CaseNode = function(array) {
  var self = new Node("case");

  if (array[0]) {
    self.value = buildBody(array[0]);
  } else {
    self.value = "default";
  }
  self.body = new NodeCollection(array[1]);

  return self;
};

var ForNode = function(array) {
  var self = new Node("for");

  self.initializer = buildBody(array[1]);
  self.condition = buildBody(array[2]);
  self.expression = buildBody(array[3]);
  self.body = buildBody(array[4]);

  return self;
};

var SequenceNode = function(array) {
  var self = new Node("sequence");

  self.nodeName = "sequence";
  self.body = new NodeCollection(array.slice(1));

  return self;
};

var TernaryNode = function(array) {
  var self = new Node("ternary");

  self.condition = buildBody(array[1]);
  self.ifTrue = buildBody(array[2]);
  self.ifFalse = buildBody(array[3]);

  return self;
};

var BreakNode = function(array) {
  var self = new Node("break");

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