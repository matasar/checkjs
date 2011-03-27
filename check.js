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

  self.accept = function (visitor) {
    visitor['visit' + self.nodeName](self);
  };

  return self;
};

var NodeCollection = function (array) {
  var self = new Node("Nodes");

  self.nodes = array.map(buildBody);

  self.accept = function (visitor) {
    self.nodes.forEach(function (ea) {
      ea.accept(visitor);
    });
  };

  return self;
};

var TopLevelNode = function (array) {
  var self = new Node("TopLevel");
  var rest = array.slice(1);

  self.nodes = new NodeCollection(rest[0]);

  self.accept = function (visitor) {
    visitor.visitTopLevel(self);
    self.nodes.accept(visitor);
  };

  return self;
};

var FunctionNode = function (array) {
  var self = new Node("Function");

  self.fn = array[1];
  self.arguments = array[2];

  self.body = new NodeCollection(array.slice(3)[0]);

  self.accept = function (visitor) {
    visitor.visitFunction(self);
    self.body.accept(visitor);
  };

  return self;
};

var ReturnNode = function (array) {
  var self = new Node("Return");
  var rest = array.slice(1)[0];

  self.body = buildBody(rest);

  self.accept = function (visitor) {
    visitor.visitReturn(self);
    self.body.accept(visitor);
  };

  return self;
}

var VarNode = function (array) {
  var self = new Node("Var");

  self.assigns = array.slice(1).map(function (ea) { return new VarAssignmentNode(ea); });

  self.accept = function (visitor) {
    self.assigns.forEach(function (ea) {
      ea.accept(visitor);
    });
  };
  return self;
};

var VarAssignmentNode = function (array) {
  var self = new Node("VarAssignment");
  self.name = array[0][0];

  if (array[0][1]) {
    self.body = buildBody(array[0][1]);
  } else {
    self.body = [];
  }

  console.log(self);
  return self;
};

var StatNode = function (array) {
  var self = new Node("Stat");

  self.body = buildBody(array[1]);

  return self;
};

var ValueNode = function (array) {
  var self = new Node("Value");

  self.type = array[0];
  self.value = array[1];

  return self;
};

var BinaryNode = function (array) {
  var self = new Node("Binary");

  self.operator = array[1];
  self.lhs = buildBody(array[2]);
  self.rhs = buildBody(array[3]);

  return self;
};

var ArrayNode = function (array) {
  var self = new Node("Array");

  self.elements = new NodeCollection(array[1]);

  return self;
};

var CallNode = function (array) {
  var self = new Node("Call");

  self.callee = buildBody(array[1]);
  self.arguments = new NodeCollection(array[2]);

  return self;
}

var RegexNode = function (array) {
  var self = new Node("Regex");

  self.string = array[1];
  self.modifiers = array[2];

  return self;
};

var ObjectNode = function (array) {
  var self = new Node("Object");

  self.nodes = array[1].map(function (ea) { new KeyValueNode(ea); });

  return self;
};

var KeyValueNode = function(array) {
  var self = new Node("KeyValue");

  self.key = array[0];
  self.value = buildBody(array[1]);

  return self;
};

var BlockNode = function(array) {
  var self = new Node("Block");
  self.body = new NodeCollection(array[1] || []);

  return self;
};

var IfNode = function(array) {
  var self = new Node("If");

  self.condition = buildBody(array[1]);
  self.body = buildBody(array[2]);
  return self;
};

var AssignNode = function(array) {
  var self = new Node("Assign");

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
};

var UnaryPostfixNode = function(array) {
  return new UnaryNode("Postfix", array);
};

var UnaryPrefixNode = function(array) {
  return new UnaryNode("Prefix", array);
};

var NewNode = function(array) {
  var self = new Node("New");

  self.fn = buildBody(array[1]);
  self.arguments = new NodeCollection(array[2]);

  return self;
};

var DotNode = function(array) {
  var self = new Node(array[0].charAt(0).toUpperCase() + array[0].slice(1));

  self.body = buildBody(array[1]);
  self.accessor = array[2];

  return self;
};

var TryNode = function(array) {
  var self = new Node("Try");

  self.body = new NodeCollection(array[1] || []);
  self.exception = buildBody(array[2]);
  self.finally = new NodeCollection(array[3] || []);
  return self;
};

var ExceptionNode = function(array) {
  var self = new Node("Exception");

  self.block = new NodeCollection(array[1]);

  return self;
};

var ThrowNode = function(array) {
  var self = new Node("Throw");

  self.body = buildBody(array[1]);

  return self;
};

var WhileNode = function(array) {
  var self = new Node("While");

  self.condition = buildBody(array[1]);
  self.body = buildBody(array[2]);

  return self;
};

var SwitchNode = function(array) {
  var self = new Node("Switch");

  self.value = buildBody(array[1]);
  self.cases = array[2].map(function (ea) { return new CaseNode(ea); });
  return self;
};

var CaseNode = function(array) {
  var self = new Node("Case");

  if (array[0]) {
    self.value = buildBody(array[0]);
  } else {
    self.value = "default";
  }
  self.body = new NodeCollection(array[1]);

  return self;
};

var ForNode = function(array) {
  var self = new Node("For");

  self.initializer = buildBody(array[1]);
  self.condition = buildBody(array[2]);
  self.expression = buildBody(array[3]);
  self.body = buildBody(array[4]);

  return self;
};

var SequenceNode = function(array) {
  var self = new Node("Sequence");

  self.body = new NodeCollection(array.slice(1));

  return self;
};

var TernaryNode = function(array) {
  var self = new Node("Ternary");

  self.condition = buildBody(array[1]);
  self.ifTrue = buildBody(array[2]);
  self.ifFalse = buildBody(array[3]);

  return self;
};

var BreakNode = function(array) {
  var self = new Node("Break");

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
  return new constructor(ast, ast);
};

var Visitor = function () {
  var self = {};

  var nothing = function (node) {};

  self.visitTopLevel = nothing;
  self.visitNodes = nothing;
  self.visitStat = nothing;
  self.visitFunction = nothing;
  self.visitVar = nothing;
  self.visitIf = nothing;
  self.visitBlock = nothing;
  self.visitReturn = nothing;
  self.visitTry = nothing;
  self.visitThrow = nothing;
  self.visitWhile = nothing;
  self.visitSwitch = nothing;
  self.visitFor = nothing;
  self.visitCall = nothing;
  self.visitBinary = nothing;
  self.visitValue = nothing;
  self.visitPrefix = nothing;
  self.visitTernary = nothing;
  self.visitDot = nothing;
  self.visitVarAssignment = nothing;

  return self;
}

files.forEach(function (file) {
    fs.readFile(file, 'utf-8', function(err, data) {
      var nodes = buildNodes(data);
      nodes.accept(new Visitor());
    });
});