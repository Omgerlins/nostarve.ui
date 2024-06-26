"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _traverse = require("../traverse");

var _gen = require("../util/gen");

var _identifiers = require("../util/identifiers");

var _insert = require("../util/insert");

var _transform = _interopRequireDefault(require("./transform"));

var _compare = require("../util/compare");

var _random = require("../util/random");

var _probability = require("../probability");

var _constants = require("../constants");

var _order = require("../order");

var _template = _interopRequireDefault(require("../templates/template"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * A Dispatcher processes function calls. All the function declarations are brought into a dictionary.
 *
 * ```js
 * var param1;
 * function dispatcher(key){
 *     var fns = {
 *         'fn1': function(){
 *             var [arg1] = [param1];
 *             console.log(arg1);
 *         }
 *     }
 *     return fns[key]();
 * };
 * param1 = "Hello World";
 * dispatcher('fn1'); // > "Hello World"
 * ```
 *
 * Can break code with:
 *
 * 1. testing function equality,
 * 2. using `arguments.callee`,
 * 3. using `this`
 */
class Dispatcher extends _transform.default {
  // Debug mode preserves function names
  constructor(o) {
    super(o, _order.ObfuscateOrder.Dispatcher);

    _defineProperty(this, "isDebug", false);

    _defineProperty(this, "count", void 0);

    this.count = 0;
  }

  match(object, parents) {
    if ((0, _compare.isInsideType)("AwaitExpression", object, parents)) {
      return false;
    }

    return (0, _insert.isVarContext)(object) && object.type !== "ArrowFunctionExpression" && !object.$dispatcherSkip && !parents.find(x => x.$dispatcherSkip);
  }

  transform(object, parents) {
    return () => {
      if ((0, _probability.ComputeProbabilityMap)(this.options.dispatcher, mode => mode)) {
        if (object.type != "Program" && object.body.type != "BlockStatement") {
          return;
        } // Map of FunctionDeclarations


        var functionDeclarations = Object.create(null); // Array of Identifier nodes

        var identifiers = [];
        var illegalFnNames = new Set(); // New Names for Functions

        var newFnNames = Object.create(null); // [old name]: randomized name

        var context = (0, _insert.isVarContext)(object) ? object : (0, _insert.getVarContext)(object, parents);
        (0, _traverse.walk)(object, parents, (o, p) => {
          if (object == o) {
            // Fix 1
            return;
          }

          var c = (0, _insert.getVarContext)(o, p);

          if (o.type == "FunctionDeclaration") {
            c = (0, _insert.getVarContext)(p[0], p.slice(1));
          }

          if (context === c) {
            if (o.type == "FunctionDeclaration" && o.id.name) {
              var name = o.id.name;

              if (o.$requiresEval || o.async || o.generator || p.find(x => x.$dispatcherSkip || x.type == "MethodDefinition") || o.body.type != "BlockStatement") {
                illegalFnNames.add(name);
              } // If dupe, no routing


              if (functionDeclarations[name]) {
                illegalFnNames.add(name);
                return;
              }

              (0, _traverse.walk)(o, p, (oo, pp) => {
                if (oo.type == "Identifier" && oo.name == "arguments" || oo.type == "ThisExpression" || oo.type == "Super") {
                  if ((0, _insert.getVarContext)(oo, pp) === o) {
                    illegalFnNames.add(name);
                    return "EXIT";
                  }
                } // Avoid functions with function expressions as they have a different scope


                if ((oo.type === "FunctionExpression" || oo.type === "ArrowFunctionExpression") && pp.find(x => x == o.params)) {
                  illegalFnNames.add(name);
                  return "EXIT";
                }
              });
              functionDeclarations[name] = [o, p];
            }
          }

          if (o.type == "Identifier") {
            if (_constants.reservedIdentifiers.has(o.name)) {
              return;
            }

            var info = (0, _identifiers.getIdentifierInfo)(o, p);

            if (!info.spec.isReferenced) {
              return;
            }

            if (info.spec.isDefined) {
              if (info.isFunctionDeclaration) {
                if (p[0].id && (!functionDeclarations[p[0].id.name] || functionDeclarations[p[0].id.name][0] !== p[0])) {
                  illegalFnNames.add(o.name);
                }
              } else {
                illegalFnNames.add(o.name);
              }
            } else if (info.spec.isModified) {
              illegalFnNames.add(o.name);
            } else {
              identifiers.push([o, p]);
            }
          }
        });
        illegalFnNames.forEach(name => {
          delete functionDeclarations[name];
        }); // map original name->new game

        var gen = this.getGenerator();
        Object.keys(functionDeclarations).forEach(name => {
          newFnNames[name] = this.isDebug ? "_dispatcher_" + this.count + "_" + name : gen.generate();
        }); // set containing new name

        var set = new Set(Object.keys(newFnNames)); // Only make a dispatcher function if it caught any functions

        if (set.size > 0) {
          var payloadArg = this.getPlaceholder() + "_dispatcher_" + this.count + "_payload";
          var dispatcherFnName = this.getPlaceholder() + "_dispatcher_" + this.count;
          this.log(dispatcherFnName, set);
          this.count++;
          var expectedGet = gen.generate();
          var expectedClearArgs = gen.generate();
          var expectedNew = gen.generate();
          var returnProp = gen.generate();
          var newReturnMemberName = gen.generate();
          var shuffledKeys = (0, _random.shuffle)(Object.keys(functionDeclarations));
          var mapName = this.getPlaceholder();
          var cacheName = this.getPlaceholder(); // creating the dispatcher function
          // 1. create function map

          var map = (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)(mapName, (0, _gen.ObjectExpression)(shuffledKeys.map(name => {
            var [def, defParents] = functionDeclarations[name];
            var body = (0, _insert.getBlockBody)(def.body);
            var functionExpression = { ...def,
              expression: false,
              type: "FunctionExpression",
              id: null
            };
            this.addComment(functionExpression, name);

            if (def.params.length > 0) {
              const fixParam = param => {
                return param;
              };

              var variableDeclaration = (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)({
                type: "ArrayPattern",
                elements: def.params.map(fixParam)
              }, (0, _gen.Identifier)(payloadArg)));
              (0, _insert.prepend)(def.body, variableDeclaration); // replace params with random identifiers

              var args = [0, 1, 2].map(x => this.getPlaceholder());
              functionExpression.params = args.map(x => (0, _gen.Identifier)(x));
              var deadCode = (0, _random.choice)(["fakeReturn", "ifStatement"]);

              switch (deadCode) {
                case "fakeReturn":
                  // Dead code...
                  var ifStatement = (0, _gen.IfStatement)((0, _gen.UnaryExpression)("!", (0, _gen.Identifier)(args[0])), [(0, _gen.ReturnStatement)((0, _gen.CallExpression)((0, _gen.Identifier)(args[1]), [(0, _gen.ThisExpression)(), (0, _gen.Identifier)(args[2])]))], null);
                  body.unshift(ifStatement);
                  break;

                case "ifStatement":
                  var test = (0, _gen.LogicalExpression)("||", (0, _gen.Identifier)(args[0]), (0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(args[1]), (0, _gen.CallExpression)((0, _gen.Identifier)(args[2]), [])));
                  def.body = (0, _gen.BlockStatement)([(0, _gen.IfStatement)(test, [...body], null), (0, _gen.ReturnStatement)((0, _gen.Identifier)(args[1]))]);
                  break;
              }
            } // For logging purposes


            var signature = name + "(" + def.params.map(x => x.name || "<>").join(",") + ")";
            this.log("Added", signature); // delete ref in block

            if (defParents.length) {
              (0, _insert.deleteDirect)(def, defParents[0]);
            }

            this.addComment(functionExpression, signature);
            return (0, _gen.Property)((0, _gen.Literal)(newFnNames[name]), functionExpression, false);
          }))));
          var getterArgName = this.getPlaceholder();
          var x = this.getPlaceholder();
          var y = this.getPlaceholder();
          var z = this.getPlaceholder();

          function getAccessor() {
            return (0, _gen.MemberExpression)((0, _gen.Identifier)(mapName), (0, _gen.Identifier)(x), true);
          } // 2. define it


          var fn = (0, _gen.FunctionDeclaration)(dispatcherFnName, [(0, _gen.Identifier)(x), (0, _gen.Identifier)(y), (0, _gen.Identifier)(z)], [// Define map of callable functions
          map, // Set returning variable to undefined
          (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)(returnProp)), // Arg to clear the payload
          (0, _gen.IfStatement)((0, _gen.BinaryExpression)("==", (0, _gen.Identifier)(y), (0, _gen.Literal)(expectedClearArgs)), [(0, _gen.ExpressionStatement)((0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(payloadArg), (0, _gen.ArrayExpression)([])))], null), // Arg to get a function reference
          (0, _gen.IfStatement)((0, _gen.BinaryExpression)("==", (0, _gen.Identifier)(y), (0, _gen.Literal)(expectedGet)), [// Getter flag: return the function object
          (0, _gen.ExpressionStatement)((0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(returnProp), (0, _gen.LogicalExpression)("||", (0, _gen.MemberExpression)((0, _gen.Identifier)(cacheName), (0, _gen.Identifier)(x), true), (0, _gen.AssignmentExpression)("=", (0, _gen.MemberExpression)((0, _gen.Identifier)(cacheName), (0, _gen.Identifier)(x), true), (0, _gen.FunctionExpression)([(0, _gen.RestElement)((0, _gen.Identifier)(getterArgName))], [// Arg setter
          (0, _gen.ExpressionStatement)((0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(payloadArg), (0, _gen.Identifier)(getterArgName))), // Call fn & return
          (0, _gen.ReturnStatement)((0, _gen.CallExpression)((0, _gen.MemberExpression)(getAccessor(), (0, _gen.Identifier)("call"), false), [(0, _gen.ThisExpression)(), (0, _gen.Literal)(gen.generate())]))])))))], [// Call the function, return result
          (0, _gen.ExpressionStatement)((0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(returnProp), (0, _gen.CallExpression)(getAccessor(), [(0, _gen.Literal)(gen.generate())])))]), // Check how the function was invoked (new () vs ())
          (0, _gen.IfStatement)((0, _gen.BinaryExpression)("==", (0, _gen.Identifier)(z), (0, _gen.Literal)(expectedNew)), [// Wrap in object
          (0, _gen.ReturnStatement)((0, _gen.ObjectExpression)([(0, _gen.Property)((0, _gen.Identifier)(newReturnMemberName), (0, _gen.Identifier)(returnProp), false)]))], [// Return raw result
          (0, _gen.ReturnStatement)((0, _gen.Identifier)(returnProp))])]);
          (0, _insert.append)(object, fn);

          if (payloadArg) {
            (0, _insert.prepend)(object, (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)(payloadArg, (0, _gen.ArrayExpression)([]))));
          }

          identifiers.forEach(_ref => {
            let [o, p] = _ref;

            if (o.type != "Identifier") {
              return;
            }

            var newName = newFnNames[o.name];

            if (!newName || typeof newName !== "string") {
              return;
            }

            if (!functionDeclarations[o.name]) {
              this.error(new Error("newName, missing function declaration"));
            }

            var info = (0, _identifiers.getIdentifierInfo)(o, p);

            if (info.isFunctionCall && p[0].type == "CallExpression" && p[0].callee === o) {
              // Invoking call expression: `a();`
              if (o.name == dispatcherFnName) {
                return;
              }

              this.log("".concat(o.name, "(").concat(p[0].arguments.map(_ => "<>").join(","), ") -> ").concat(dispatcherFnName, "('").concat(newName, "')"));
              var assignmentExpressions = [];
              var dispatcherArgs = [(0, _gen.Literal)(newName)];

              if (p[0].arguments.length) {
                assignmentExpressions = [(0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(payloadArg), (0, _gen.ArrayExpression)(p[0].arguments))];
              } else {
                dispatcherArgs.push((0, _gen.Literal)(expectedClearArgs));
              }

              var type = (0, _random.choice)(["CallExpression", "NewExpression"]);
              var callExpression = null;

              switch (type) {
                case "CallExpression":
                  callExpression = (0, _gen.CallExpression)((0, _gen.Identifier)(dispatcherFnName), dispatcherArgs);
                  break;

                case "NewExpression":
                  if (dispatcherArgs.length == 1) {
                    dispatcherArgs.push((0, _gen.Identifier)("undefined"));
                  }

                  callExpression = (0, _gen.MemberExpression)((0, _gen.NewExpression)((0, _gen.Identifier)(dispatcherFnName), [...dispatcherArgs, (0, _gen.Literal)(expectedNew)]), (0, _gen.Identifier)(newReturnMemberName), false);
                  break;
              }

              this.addComment(callExpression, "Calling " + o.name + "(" + p[0].arguments.map(x => x.name).join(", ") + ")");
              var expr = assignmentExpressions.length ? (0, _gen.SequenceExpression)([...assignmentExpressions, callExpression]) : callExpression; // Replace the parent call expression

              this.replace(p[0], expr);
            } else {
              // Non-invoking reference: `a`
              if (info.spec.isDefined) {
                if (info.isFunctionDeclaration) {
                  this.log("Skipped getter " + o.name + " (function declaration)");
                } else {
                  this.log("Skipped getter " + o.name + " (defined)");
                }

                return;
              }

              if (info.spec.isModified) {
                this.log("Skipped getter " + o.name + " (modified)");
                return;
              }

              this.log("(getter) ".concat(o.name, " -> ").concat(dispatcherFnName, "('").concat(newName, "')"));
              this.replace(o, (0, _gen.CallExpression)((0, _gen.Identifier)(dispatcherFnName), [(0, _gen.Literal)(newName), (0, _gen.Literal)(expectedGet)]));
            }
          });
          (0, _insert.prepend)(object, (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)((0, _gen.Identifier)(cacheName), (0, _template.default)("Object.create(null)").single().expression)));
        }
      }
    };
  }

}

exports.default = Dispatcher;