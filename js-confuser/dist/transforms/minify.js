"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _transform = _interopRequireDefault(require("./transform"));

var _order = require("../order");

var _gen = require("../util/gen");

var _insert = require("../util/insert");

var _compare = require("../util/compare");

var _traverse = require("../traverse");

var _assert = require("assert");

var _scope = require("../util/scope");

var _template = _interopRequireDefault(require("../templates/template"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Basic transformations to reduce code size.
 *
 * Examples:
 * - `if(a) { b() }` **->** `a && b()`
 * - `if(a){b()}else{c()}` **->** `a?b():c()`
 * - `x['y']` **->** `x.y`
 */
class Minify extends _transform.default {
  /**
   * A helper function that is introduced preserve function semantics
   */
  constructor(o) {
    super(o, _order.ObfuscateOrder.Minify);

    _defineProperty(this, "arrowFunctionName", void 0);
  }

  match(object, parents) {
    return object.hasOwnProperty("type");
  }

  transform(object, parents) {
    if ((0, _scope.isLexicalScope)(object)) {
      return () => {
        var body = object.type == "SwitchCase" ? object.consequent : (0, _insert.getBlockBody)(object);
        var earlyReturn = body.length;
        var fnDecs = [];
        body.forEach((stmt, i) => {
          if (stmt.type === "ReturnStatement" || stmt.type === "BreakStatement" || stmt.type === "ContinueStatement" || stmt.type === "ThrowStatement") {
            if (earlyReturn > i + 1) {
              earlyReturn = i + 1;
            }
          }

          if (stmt.type == "FunctionDeclaration") {
            fnDecs.push([stmt, i]);
          }
        });

        if (earlyReturn < body.length) {
          body.length = earlyReturn;
          body.push(...fnDecs.filter(x => x[1] >= earlyReturn).map(x => x[0]));
        } // Now combine ExpressionStatements


        if (body.length > 1) {
          var exprs = [];
          var startIndex = -1;
          var sequences = [];
          body.forEach((stmt, i) => {
            if (stmt.type == "ExpressionStatement" && !stmt.directive) {
              exprs.push(stmt.expression);

              if (startIndex == -1) {
                startIndex = i;
              }
            } else {
              if (exprs.length) {
                sequences.push({
                  exprs: exprs,
                  index: startIndex
                });
              }

              exprs = [];
              startIndex = -1;
            }
          });

          if (exprs.length) {
            sequences.push({
              exprs: exprs,
              index: startIndex
            });
          }

          sequences.reverse().forEach(seq => {
            (0, _assert.ok)(seq.index != -1);
            body.splice(seq.index, seq.exprs.length, (0, _gen.ExpressionStatement)(seq.exprs.length == 1 ? seq.exprs[0] : (0, _gen.SequenceExpression)(seq.exprs)));
          });
        } // Unnecessary return


        if (parents[0] && (0, _insert.isVarContext)(parents[0]) && body.length && body[body.length - 1]) {
          var last = body[body.length - 1];

          if (last.type == "ReturnStatement") {
            var isUndefined = last.argument == null;

            if (isUndefined) {
              body.pop();
            }
          }
        } // Variable declaration grouping
        // var a = 1;
        // var b = 1;
        // var c = 1;
        //
        // var a=1,b=1,c=1;


        var lastDec = null;
        var remove = [];
        body.forEach((x, i) => {
          if (x.type === "VariableDeclaration") {
            if (!lastDec || lastDec.kind !== x.kind || !lastDec.declarations.length) {
              lastDec = x;
            } else {
              lastDec.declarations.push(...(0, _insert.clone)(x.declarations));
              remove.unshift(i);
            }
          } else {
            lastDec = null;
          }
        });
        remove.forEach(x => {
          body.splice(x, 1);
        });
      };
    }
    /**
     * ES6 and higher only
     * - `function(){}` -> `()=>{}`
     * - `function abc(){}` -> `var abc = ()=>{}`
     */


    if (!this.options.es5 && (object.type == "FunctionExpression" || object.type == "FunctionDeclaration")) {
      return () => {
        // Don't touch `{get key(){...}}`
        var propIndex = parents.findIndex(x => x.type == "Property" || x.type == "MethodDefinition");

        if (propIndex !== -1) {
          if (parents[propIndex].value === (parents[propIndex - 1] || object)) {
            if (parents[propIndex].kind !== "init" || parents[propIndex].method) {
              return;
            }
          }
        }

        if (object.type === "FunctionDeclaration") {
          var body = parents[0];

          if (!Array.isArray(body)) {
            return;
          }

          var index = body.indexOf(object);

          if (index == -1) {
            return;
          }

          var before = body.slice(0, index);
          (0, _assert.ok)(!before.includes(object));
          var beforeTypes = new Set(before.map(x => x.type));
          beforeTypes.delete("FunctionDeclaration");

          if (beforeTypes.size > 0) {
            return;
          } // Test Variant #25: Don't break redefined function declaration


          if (object.id && body.find(x => x.type === "FunctionDeclaration" && x !== object && x.id && x.id.name === object.id.name)) {
            return;
          }
        }

        var canTransform = true;
        (0, _traverse.walk)(object.body, [], ($object, $parents) => {
          if ($object.type == "ThisExpression") {
            canTransform = false;
          } else if ($object.type == "Identifier") {
            if ($object.name == "arguments") {
              canTransform = false;
            }

            if ($object.name == "this") {
              this.error(new Error("Use ThisExpression instead"));
            }
          }
        });

        if (canTransform) {
          if (!this.arrowFunctionName) {
            this.arrowFunctionName = this.getPlaceholder();
            (0, _insert.append)(parents[parents.length - 1] || object, (0, _template.default)("\n            function ".concat(this.arrowFunctionName, "(arrowFn, functionLength){\n              var functionObject = function(){ return arrowFn(...arguments) };\n\n              Object[\"defineProperty\"](functionObject, \"length\", {\n                \"value\": functionLength,\n                \"configurable\": true\n              });\n\n              return functionObject;\n            }\n            ")).single());
          }

          const wrap = object => {
            return (0, _gen.CallExpression)((0, _gen.Identifier)(this.arrowFunctionName), [(0, _insert.clone)(object), (0, _gen.Literal)((0, _insert.computeFunctionLength)(object.params))]);
          };

          if (object.type == "FunctionExpression") {
            object.type = "ArrowFunctionExpression";
            this.replace(object, wrap((0, _insert.clone)(object)));
          } else {
            var arrow = { ...(0, _insert.clone)(object),
              type: "ArrowFunctionExpression"
            };
            this.replace(object, (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)(object.id.name, wrap(arrow))));
            var x = this.transform(arrow, []);

            if (typeof x === "function") {
              x();
            }
          }
        }
      };
    }
    /**
     * ()=>{ expr } -> ()=>expr
     */


    if (object.type == "ArrowFunctionExpression" && object.body.type == "BlockStatement") {
      return () => {
        var body = (0, _insert.getBlockBody)(object.body);
        var stmt1 = body[0];

        if (body.length == 1 && stmt1.type == "ReturnStatement") {
          // x=>{a: 1} // Invalid syntax
          if (stmt1.argument && stmt1.argument.type != "ObjectExpression") {
            object.body = stmt1.argument;
            object.expression = true;
          }
        } else {
          // ()=>{exprStmt;exprStmt;} -> ()=>(expr, expr, expr, undefined)
          var exprs = body.filter(x => x.type == "ExpressionStatement");

          if (exprs.length == body.length) {
            var array = [];

            function flatten(expr) {
              if (expr.type == "SequenceExpression") {
                expr.expressions.forEach(flatten);
              } else if (expr.type == "ExpressionStatement") {
                flatten(expr.expression);
              } else {
                array.push(expr);
              }
            }

            body.forEach(flatten);
            object.body = (0, _gen.SequenceExpression)([...(0, _insert.clone)(array), (0, _gen.UnaryExpression)("void", (0, _gen.Literal)(0))]);
          }
        }
      };
    } // (a()) -> a()


    if (object.type == "SequenceExpression") {
      return () => {
        if (object.expressions.length == 1) {
          this.replace(object, (0, _insert.clone)(object.expressions[0]));
        }
      };
    } // a += -1 -> a -= 1


    if (object.type == "AssignmentExpression") {
      return () => {
        if (object.operator == "+=" && object.right.type == "UnaryExpression" && object.right.operator == "-") {
          object.operator = "-=";
          object.right = object.right.argument;
        } else if ( // a -= -1 -> a += 1
        object.operator == "-=" && object.right.type == "UnaryExpression" && object.right.operator == "-") {
          object.operator = "+=";
          object.right = object.right.argument;
        }
      };
    } // a + -b -> a - b


    if (object.type == "BinaryExpression") {
      return () => {
        if (object.operator == "+" && object.right.type == "UnaryExpression" && object.right.operator == "-") {
          object.operator = "-";
          object.right = object.right.argument;
        } else if ( // a - -1 -> a + 1
        object.operator == "-" && object.right.type == "UnaryExpression" && object.right.operator == "-") {
          object.operator = "+";
          object.right = object.right.argument;
        }
      };
    }

    if (object.type == "ForStatement" || object.type == "ForInStatement" || object.type == "ForOfStatement" || object.type == "WhileStatement") {
      if (object.body.type == "BlockStatement") {
        return () => {
          if (object.body.body.length === 1) {
            object.body = object.body.body[0];
          }
        };
      }
    } // Last switch case does not need break


    if (object.type == "SwitchStatement") {
      var last = object.cases[object.cases.length - 1];

      if (last) {
        var lastStatement = last.consequent[last.consequent.length - 1];

        if (lastStatement && lastStatement.type == "BreakStatement" && lastStatement.label == null) {
          last.consequent.pop();
        }
      } else {
        if (object.cases.length == 0 && (object.discriminant.type == "Literal" || object.discriminant.type == "Identifier")) {
          if (parents[0].type == "LabeledStatement" && Array.isArray(parents[1])) {
            return () => {
              parents[1].splice(parents[1].indexOf(parents[0]), 1);
            };
          } else if (Array.isArray(parents[0])) {
            return () => {
              parents[0].splice(parents[0].indexOf(object), 1);
            };
          }
        }
      }
    } // if ( x ) { y() } -> x && y()
    // Todo Make this shit readable


    if (object.type == "IfStatement") {
      if (object.consequent.type != "BlockStatement") {
        this.replace(object.consequent, (0, _gen.BlockStatement)([(0, _insert.clone)(object.consequent)]));
      }

      if (object.alternate && object.alternate.type != "BlockStatement") {
        this.replace(object.alternate, (0, _gen.BlockStatement)([(0, _insert.clone)(object.alternate)]));
      }

      var body = (0, _insert.getBlockBody)(object.consequent); // Check for hard-coded if statements

      if (object.test.type == "Literal") {
        if (object.test.value || object.test.regex) {
          // Why would anyone test just a regex literal
          object.alternate = null;
        } else {
          object.consequent = (0, _gen.BlockStatement)([]);
        }
      }

      return () => {
        // if ( a ) { } else {b()} -> if ( !a ) b();
        if (body.length == 0 && object.alternate) {
          object.test = (0, _gen.UnaryExpression)("!", (0, _insert.clone)(object.test));

          if (object.alternate.type == "BlockStatement" && object.alternate.body.length == 1) {
            object.alternate = (0, _insert.clone)(object.alternate.body[0]);
          }

          object.consequent = object.alternate;
          object.alternate = null;
        }

        if (object.consequent && object.consequent.body && object.consequent.body.length == 1 && object.alternate && object.alternate.body.length == 1) {
          var stmt1 = (0, _insert.clone)(object.consequent.body[0]);
          var stmt2 = (0, _insert.clone)(object.alternate.body[0]); // if (a) {return b;} else {return c;} -> return a ? b : c;

          if (stmt1.type == "ReturnStatement" && stmt2.type == "ReturnStatement") {
            this.replace(object, (0, _gen.ReturnStatement)((0, _gen.ConditionalExpression)((0, _insert.clone)(object.test), stmt1.argument || (0, _gen.Identifier)("undefined"), stmt2.argument || (0, _gen.Identifier)("undefined"))));
          } // if (a) {b = 0} else {b = 1} -> b = a ? 0 : 1;


          if (stmt1.type == "ExpressionStatement" && stmt2.type == "ExpressionStatement") {
            var e1 = stmt1.expression;
            var e2 = stmt2.expression;

            if (e1.type == "AssignmentExpression" && e2.type == "AssignmentExpression") {
              if (e1.operator === e2.operator && (0, _compare.isEquivalent)(e1.left, e2.left)) {
                this.replace(object, (0, _gen.ExpressionStatement)((0, _gen.AssignmentExpression)(e1.operator, e1.left, (0, _gen.ConditionalExpression)((0, _insert.clone)(object.test), e1.right, e2.right))));
              }
            }
          }
        }
      };
    } // x["abc"] -> x.abc


    if (object.type == "MemberExpression") {
      var {
        object: obj,
        property
      } = object;

      if (property.type == "Literal" && (0, _compare.isValidIdentifier)(property.value)) {
        object.computed = false;
        object.property.type = "Identifier";
        object.property.name = (0, _insert.clone)(object.property.value); // obj.name &&
        //   this.log(
        //     obj.name +
        //       "['" +
        //       object.property.name +
        //       "'] -> " +
        //       obj.name +
        //       "." +
        //       object.property.name
        //   );
      }
    }

    if (object.type == "CallExpression") {
      if (object.callee.type == "MemberExpression") {
        var key = object.callee.computed ? object.callee.property.value : object.callee.property.name;

        if (key == "toString" && object.arguments.length == 0) {
          this.replace(object, (0, _gen.BinaryExpression)("+", (0, _gen.Literal)(""), (0, _insert.clone)(object.callee.object)));
        }
      }
    } // { "x": 1 } -> {x: 1}


    if (object.type === "Property" || object.type === "MethodDefinition") {
      if (object.key.type == "SequenceExpression" && object.key.expressions.length == 1) {
        object.key = object.key.expressions[0];
        object.computed = true;
      }

      if (object.key.type == "Literal" && typeof object.key.value === "string" && (0, _compare.isValidIdentifier)(object.key.value)) {
        object.key.type = "Identifier";
        object.key.name = object.key.value;
        object.computed = false;
      }
    }

    if (object.type == "VariableDeclarator") {
      // undefined is not necessary
      if (object.init && object.init.type == "Identifier") {
        if (object.init.name == "undefined") {
          object.init = null;
        }
      }

      if (object.id.type == "ObjectPattern" && object.init.type == "ObjectExpression") {
        if (object.id.properties.length === 1 && object.init.properties.length === 1) {
          var key1 = object.id.properties[0].computed ? object.id.properties[0].key.value : object.id.properties[0].key.name;
          var key2 = object.init.properties[0].computed ? object.init.properties[0].key.value : object.init.properties[0].key.name; // console.log(key1, key2);

          if (key1 && key2 && key1 === key2) {
            object.id = object.id.properties[0].value;
            object.init = object.init.properties[0].value;
          }
        }
      } // check for redundant patterns


      if (object.id.type == "ArrayPattern" && object.init && typeof object.init === "object" && object.init.type == "ArrayExpression") {
        if (object.id.elements.length == 1 && object.init.elements.length == 1) {
          object.id = object.id.elements[0];
          object.init = object.init.elements[0];
        }
      }
    }

    if (object.type == "Literal") {
      return () => {
        switch (typeof object.value) {
          case "boolean":
            this.replaceIdentifierOrLiteral(object, (0, _gen.UnaryExpression)("!", (0, _gen.Literal)(object.value ? 0 : 1)), parents);
            break;
        }
      };
    }

    if (object.type == "Identifier") {
      return () => {
        if (object.name == "undefined" && !(0, _insert.isForInitialize)(object, parents)) {
          this.replaceIdentifierOrLiteral(object, (0, _gen.UnaryExpression)("void", (0, _gen.Literal)(0)), parents);
        } else if (object.name == "Infinity") {
          this.replaceIdentifierOrLiteral(object, (0, _gen.BinaryExpression)("/", (0, _gen.Literal)(1), (0, _gen.Literal)(0)), parents);
        }
      };
    }

    if (object.type == "UnaryExpression" && object.operator == "!") {
      if (object.argument.type == "Literal" && !object.argument.regex) {
        this.replace(object, (0, _gen.Literal)(!object.argument.value));
      }
    }

    if (object.type == "ConditionalExpression") {
      if (object.test.type == "Literal" && !object.test.regex) {
        this.replace(object, object.test.value ? object.consequent : object.alternate);
      }
    }
  }

}

exports.default = Minify;