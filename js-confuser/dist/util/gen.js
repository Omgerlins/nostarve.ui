"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AddComment = AddComment;
exports.ArrayExpression = ArrayExpression;
exports.ArrayPattern = ArrayPattern;
exports.AssignmentExpression = AssignmentExpression;
exports.AssignmentPattern = AssignmentPattern;
exports.AwaitExpression = AwaitExpression;
exports.BinaryExpression = BinaryExpression;
exports.BlockStatement = BlockStatement;
exports.BreakStatement = BreakStatement;
exports.CallExpression = CallExpression;
exports.CatchClause = CatchClause;
exports.ClassDeclaration = ClassDeclaration;
exports.ClassExpression = ClassExpression;
exports.ConditionalExpression = ConditionalExpression;
exports.DebuggerStatement = DebuggerStatement;
exports.ExpressionStatement = ExpressionStatement;
exports.ForStatement = ForStatement;
exports.FunctionDeclaration = FunctionDeclaration;
exports.FunctionExpression = FunctionExpression;
exports.Identifier = Identifier;
exports.IfStatement = IfStatement;
exports.LabeledStatement = LabeledStatement;
exports.Literal = Literal;
exports.LogicalExpression = LogicalExpression;
exports.MemberExpression = MemberExpression;
exports.MethodDefinition = MethodDefinition;
exports.NewExpression = NewExpression;
exports.ObjectExpression = ObjectExpression;
exports.Property = Property;
exports.RegexLiteral = RegexLiteral;
exports.RestElement = RestElement;
exports.ReturnStatement = ReturnStatement;
exports.SequenceExpression = SequenceExpression;
exports.SpreadElement = SpreadElement;
exports.SwitchCase = SwitchCase;
exports.SwitchDefaultCase = SwitchDefaultCase;
exports.SwitchStatement = SwitchStatement;
exports.ThisExpression = ThisExpression;
exports.ThrowStatement = ThrowStatement;
exports.TryStatement = TryStatement;
exports.UnaryExpression = UnaryExpression;
exports.UpdateExpression = UpdateExpression;
exports.VariableDeclaration = VariableDeclaration;
exports.VariableDeclarator = VariableDeclarator;
exports.WhileStatement = WhileStatement;
exports.WithStatement = WithStatement;

var _assert = require("assert");

function Literal(value) {
  if (typeof value === "undefined") {
    throw new Error("value is undefined");
  }

  if (typeof value == "number" && value < 0) {
    return UnaryExpression("-", Literal(Math.abs(value)));
  }

  (0, _assert.ok)(value === value, "NaN value is disallowed");
  return {
    type: "Literal",
    value: value
  };
}

function RegexLiteral(pattern, flags) {
  return {
    type: "Literal",
    regex: {
      pattern,
      flags
    }
  };
}

function Identifier(name) {
  if (!name) {
    throw new Error("name is null/empty");
  }

  if (name == "this") {
    throw new Error("Use ThisExpression");
  }

  if (name == "super") {
    throw new Error("Use Super");
  }

  return {
    type: "Identifier",
    name: name.toString()
  };
}

function BlockStatement(body) {
  if (!Array.isArray(body)) {
    throw new Error("not array");
  }

  return {
    type: "BlockStatement",
    body: body
  };
}

function LogicalExpression(operator, left, right) {
  return {
    type: "LogicalExpression",
    operator,
    left,
    right
  };
}

function BinaryExpression(operator, left, right) {
  if (operator == "||" || operator == "&&") {
    throw new Error("invalid operator, use LogicalExpression");
  }

  return {
    type: "BinaryExpression",
    operator,
    left,
    right
  };
}

function ThisExpression() {
  return {
    type: "ThisExpression"
  };
}

function SwitchCase(test, consequent) {
  (0, _assert.ok)(test === null || test);
  (0, _assert.ok)(Array.isArray(consequent));
  return {
    type: "SwitchCase",
    test,
    consequent
  };
}

function SwitchDefaultCase(consequent) {
  return SwitchCase(null, consequent);
}

function LabeledStatement(label, body) {
  return {
    type: "LabeledStatement",
    label: Identifier(label),
    body: body
  };
}

function SwitchStatement(discriminant, cases) {
  return {
    type: "SwitchStatement",
    discriminant: discriminant,
    cases: cases
  };
}

function BreakStatement(label) {
  return {
    type: "BreakStatement",
    label: label ? Identifier(label) : null
  };
}

function Property(key, value) {
  let computed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  let kind = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "init";

  if (!key) {
    throw new Error("key is undefined");
  }

  if (!value) {
    throw new Error("value is undefined");
  }

  return {
    type: "Property",
    key: key,
    computed: computed,
    value: value,
    kind: kind,
    method: false,
    shorthand: false
  };
}

function ObjectExpression(properties) {
  if (!properties) {
    throw new Error("properties is null");
  }

  return {
    type: "ObjectExpression",
    properties: properties
  };
}

function VariableDeclarator(id) {
  let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  if (typeof id === "string") {
    id = Identifier(id);
  }

  return {
    type: "VariableDeclarator",
    id,
    init
  };
}

function VariableDeclaration(declarations) {
  let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "var";

  if (!Array.isArray(declarations)) {
    declarations = [declarations];
  }

  (0, _assert.ok)(Array.isArray(declarations));
  (0, _assert.ok)(declarations.length);
  (0, _assert.ok)(!declarations.find(x => x.type == "ExpressionStatement"));
  return {
    type: "VariableDeclaration",
    declarations: declarations,
    kind: kind
  };
}

function ForStatement(variableDeclaration, test, update, body) {
  (0, _assert.ok)(variableDeclaration);
  (0, _assert.ok)(test);
  (0, _assert.ok)(update);
  return {
    type: "ForStatement",
    init: variableDeclaration,
    test: test,
    update: update,
    body: BlockStatement(body)
  };
}

function WhileStatement(test, body) {
  (0, _assert.ok)(test);
  return {
    type: "WhileStatement",
    test,
    body: BlockStatement(body)
  };
}

function IfStatement(test, consequent) {
  let alternate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  if (!test) {
    throw new Error("test is undefined");
  }

  if (!consequent) {
    throw new Error("consequent undefined, use empty array instead");
  }

  if (!Array.isArray(consequent)) {
    throw new Error("consequent needs to be array, found " + consequent.type);
  }

  if (alternate && !Array.isArray(alternate)) {
    throw new Error("alternate needs to be array, found " + alternate.type);
  }

  return {
    type: "IfStatement",
    test: test,
    consequent: BlockStatement(consequent),
    alternate: alternate ? BlockStatement(alternate) : null
  };
}

function FunctionExpression(params, body) {
  (0, _assert.ok)(Array.isArray(params), "params should be an array");
  return {
    type: "FunctionExpression",
    id: null,
    params: params,
    body: BlockStatement(body),
    generator: false,
    expression: false,
    async: false
  };
}
/**
 * ```js
 * function name(p[0], p[1], p[2], ...p[4]){
 *     body[0];
 *     body[1]...
 * }
 * ```
 * @param name
 * @param params
 * @param body
 */


function FunctionDeclaration(name, params, body) {
  if (!body) {
    throw new Error("undefined body");
  }

  if (body && Array.isArray(body[0])) {
    throw new Error("nested array");
  }

  (0, _assert.ok)(Array.isArray(params), "params should be an array");
  return {
    type: "FunctionDeclaration",
    id: Identifier(name),
    params: params,
    body: BlockStatement(body),
    generator: false,
    expression: false,
    async: false
  };
}

function DebuggerStatement() {
  return {
    type: "DebuggerStatement"
  };
}

function ReturnStatement() {
  let argument = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

  if (argument) {
    (0, _assert.ok)(argument.type, "Argument should be a node");
  }

  return {
    type: "ReturnStatement",
    argument: argument
  };
}

function AwaitExpression(argument) {
  (0, _assert.ok)(argument.type, "Argument should be a node");
  return {
    type: "AwaitExpression",
    argument
  };
}

function ConditionalExpression(test, consequent, alternate) {
  (0, _assert.ok)(test);
  (0, _assert.ok)(consequent);
  (0, _assert.ok)(alternate);
  return {
    type: "ConditionalExpression",
    test,
    consequent,
    alternate
  };
}

function ExpressionStatement(expression) {
  (0, _assert.ok)(expression.type);
  return {
    type: "ExpressionStatement",
    expression: expression
  };
}

function UnaryExpression(operator, argument) {
  (0, _assert.ok)(typeof operator === "string");
  (0, _assert.ok)(argument.type);
  return {
    type: "UnaryExpression",
    operator,
    argument
  };
}

function UpdateExpression(operator, argument) {
  let prefix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  return {
    type: "UpdateExpression",
    operator,
    argument,
    prefix
  };
}

function SequenceExpression(expressions) {
  if (!expressions) {
    throw new Error("expressions undefined");
  }

  if (!expressions.length) {
    throw new Error("expressions length = 0");
  }

  return {
    type: "SequenceExpression",
    expressions: expressions
  };
}

function MemberExpression(object, property) {
  let computed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  if (!object) {
    throw new Error("object undefined");
  }

  if (!property) {
    throw new Error("property undefined");
  }

  if (!computed && property.type == "Literal") {
    throw new Error("literal must be computed property");
  }

  if (object.name == "new" && property.name == "target") {
    throw new Error("new.target is a MetaProperty");
  }

  return {
    type: "MemberExpression",
    computed: computed,
    object: object,
    property: property
  };
}

function CallExpression(callee, args) {
  (0, _assert.ok)(Array.isArray(args), "args should be an array");
  return {
    type: "CallExpression",
    callee: callee,
    arguments: args
  };
}

function NewExpression(callee, args) {
  return {
    type: "NewExpression",
    callee,
    arguments: args
  };
}

function AssignmentExpression(operator, left, right) {
  return {
    type: "AssignmentExpression",
    operator: operator,
    left: left,
    right: right
  };
}

function ArrayPattern(elements) {
  (0, _assert.ok)(Array.isArray(elements));
  return {
    type: "ArrayPattern",
    elements: elements
  };
}

function ArrayExpression(elements) {
  (0, _assert.ok)(Array.isArray(elements));
  return {
    type: "ArrayExpression",
    elements
  };
}

function AssignmentPattern(left, right) {
  (0, _assert.ok)(left);
  (0, _assert.ok)(right);
  return {
    type: "AssignmentPattern",
    left: left,
    right: right
  };
}

function AddComment(node, text) {
  if (node.leadingComments) {
    node.leadingComments.push({
      type: "Block",
      value: text
    });
  } else {
    Object.assign(node, {
      leadingComments: [{
        type: "Block",
        value: text
      }]
    });
  }

  return node;
}

function MethodDefinition(identifier, functionExpression, kind) {
  let isStatic = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
  let computed = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  return {
    type: "MethodDefinition",
    key: identifier,
    computed: computed,
    value: functionExpression,
    kind: kind,
    static: isStatic
  };
}

function ClassDeclaration(id) {
  let superClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let body = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  return {
    type: "ClassDeclaration",
    id: id,
    superClass: superClass,
    body: {
      type: "ClassBody",
      body: body
    }
  };
}

function ClassExpression(id) {
  let superClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let body = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  return {
    type: "ClassExpression",
    id: id,
    superClass: superClass,
    body: {
      type: "ClassBody",
      body: body
    }
  };
}

function ThrowStatement(argument) {
  return {
    type: "ThrowStatement",
    argument: argument
  };
}

function WithStatement(object, body) {
  (0, _assert.ok)(object, "object");
  (0, _assert.ok)(object.type, "object should be node");
  return {
    type: "WithStatement",
    object,
    body: BlockStatement(body)
  };
}
/**
 * `fn(...args)`
 * @param argument
 * @returns
 */


function SpreadElement(argument) {
  return {
    type: "SpreadElement",
    argument
  };
}
/**
 * `function fn(...params){}`
 * @param argument
 * @returns
 */


function RestElement(argument) {
  return {
    type: "RestElement",
    argument
  };
}

function CatchClause() {
  let param = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
  let body = arguments.length > 1 ? arguments[1] : undefined;
  return {
    type: "CatchClause",
    param: param,
    body: BlockStatement(body)
  };
}

function TryStatement(body, handler, finallyBody) {
  (0, _assert.ok)(handler);
  (0, _assert.ok)(handler.type == "CatchClause");
  return {
    type: "TryStatement",
    block: BlockStatement(body),
    handler: handler,
    finalizer: finallyBody ? BlockStatement(finallyBody) : null
  };
}