"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _transform = _interopRequireDefault(require("../transform"));

var _gen = require("../../util/gen");

var _traverse = _interopRequireWildcard(require("../../traverse"));

var _random = require("../../util/random");

var _crash = require("../../templates/crash");

var _insert = require("../../util/insert");

var _template = _interopRequireDefault(require("../../templates/template"));

var _order = require("../../order");

var _integrity = _interopRequireDefault(require("./integrity"));

var _antiDebug = _interopRequireDefault(require("./antiDebug"));

var _identifiers = require("../../util/identifiers");

var _compare = require("../../util/compare");

var _assert = require("assert");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Applies browser & date locks.
 */
class Lock extends _transform.default {
  /**
   * This is a boolean variable injected into the source code determining wether the countermeasures function has been called.
   * This is used to prevent infinite loops from happening
   */
  constructor(o) {
    super(o, _order.ObfuscateOrder.Lock); // Removed feature
    // if (this.options.lock.startDate && this.options.lock.endDate) {
    //   this.before.push(new LockStrings(o));
    // }

    _defineProperty(this, "globalVar", void 0);

    _defineProperty(this, "counterMeasuresNode", void 0);

    _defineProperty(this, "iosDetectFn", void 0);

    _defineProperty(this, "counterMeasuresActivated", void 0);

    _defineProperty(this, "made", void 0);

    if (this.options.lock.integrity) {
      this.before.push(new _integrity.default(o, this));
    }

    if (this.options.lock.antiDebug) {
      this.before.push(new _antiDebug.default(o, this));
    }

    this.made = 0;
  }

  apply(tree) {
    if (typeof this.options.lock.countermeasures === "string" && (0, _compare.isValidIdentifier)(this.options.lock.countermeasures)) {
      (0, _traverse.default)(tree, (object, parents) => {
        if (object.type == "Identifier" && object.name === this.options.lock.countermeasures) {
          var info = (0, _identifiers.getIdentifierInfo)(object, parents);

          if (info.spec.isDefined) {
            if (this.counterMeasuresNode) {
              throw new Error("Countermeasures function was already defined, it must have a unique name from the rest of your code");
            } else {
              var definingContext = (0, _insert.getVarContext)(parents[0], parents.slice(1));

              if (definingContext != tree) {
                throw new Error("Countermeasures function must be defined at the global level");
              }

              var chain = [object, parents];

              if (info.isFunctionDeclaration) {
                chain = [parents[0], parents.slice(1)];
              } else if (info.isVariableDeclaration) {
                chain = [parents[1], parents.slice(2)];
              }

              this.counterMeasuresNode = chain;
            }
          }
        }
      });

      if (!this.counterMeasuresNode) {
        throw new Error("Countermeasures function named '" + this.options.lock.countermeasures + "' was not found.");
      }
    }

    super.apply(tree);
  }

  getCounterMeasuresCode(object, parents) {
    var opt = this.options.lock.countermeasures;

    if (opt === false) {
      return null;
    } // Call function


    if (typeof opt === "string") {
      if (!this.counterMeasuresActivated) {
        this.counterMeasuresActivated = this.getPlaceholder();
        (0, _insert.prepend)(parents[parents.length - 1] || object, (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)(this.counterMeasuresActivated)));
      } // Since Lock occurs before variable renaming, we are using the pre-obfuscated function name


      return [(0, _gen.ExpressionStatement)((0, _gen.LogicalExpression)("||", (0, _gen.Identifier)(this.counterMeasuresActivated), (0, _gen.SequenceExpression)([(0, _gen.AssignmentExpression)("=", (0, _gen.Identifier)(this.counterMeasuresActivated), (0, _gen.Literal)(true)), (0, _gen.CallExpression)((0, _template.default)(opt).single().expression, [])])))];
    }

    var type = (0, _random.choice)(["crash", "exit"]);

    switch (type) {
      case "crash":
        var varName = this.getPlaceholder();
        return (0, _random.choice)([_crash.CrashTemplate1, _crash.CrashTemplate2, _crash.CrashTemplate3]).compile({
          var: varName
        });

      case "exit":
        if (this.options.target == "browser") {
          return (0, _template.default)("document.documentElement.innerHTML = '';").compile();
        }

        return (0, _template.default)("process.exit()").compile();
    }
  }
  /**
   * Converts Dates to numbers, then applies some randomness
   * @param object
   */


  getTime(object) {
    if (!object) {
      return 0;
    }

    if (object instanceof Date) {
      return this.getTime(object.getTime());
    }

    return object + (0, _random.getRandomInteger)(-4000, 4000);
  }

  match(object, parents) {
    return (0, _traverse.isBlock)(object);
  }

  transform(object, parents) {
    if (parents.find(x => (0, _compare.isLoop)(x) && x.type != "SwitchStatement")) {
      return;
    } // no check in countermeasures code, otherwise it will infinitely call itself


    if (this.counterMeasuresNode && (object == this.counterMeasuresNode[0] || parents.indexOf(this.counterMeasuresNode[0]) !== -1)) {
      return;
    }

    var block = (0, _traverse.getBlock)(object, parents);
    var choices = [];

    if (this.options.lock.startDate) {
      choices.push("startDate");
    }

    if (this.options.lock.endDate) {
      choices.push("endDate");
    }

    if (this.options.lock.domainLock && this.options.lock.domainLock.length) {
      choices.push("domainLock");
    }

    if (this.options.lock.context && this.options.lock.context.length) {
      choices.push("context");
    }

    if (this.options.lock.browserLock && this.options.lock.browserLock.length) {
      choices.push("browserLock");
    }

    if (this.options.lock.osLock && this.options.lock.osLock.length) {
      choices.push("osLock");
    }

    if (this.options.lock.selfDefending) {
      choices.push("selfDefending");
    }

    if (!choices.length) {
      return;
    }

    return () => {
      this.made++;

      if (this.made > 150) {
        return;
      }

      var type = (0, _random.choice)(choices);
      var nodes = [];
      var dateNow = (0, _gen.CallExpression)((0, _gen.MemberExpression)((0, _gen.Identifier)("Date"), (0, _gen.Literal)("now"), true), []);

      if (Math.random() > 0.5) {
        dateNow = (0, _gen.CallExpression)((0, _gen.MemberExpression)((0, _gen.NewExpression)((0, _gen.Identifier)("Date"), []), (0, _gen.Literal)("getTime")), []);
      }

      if (Math.random() > 0.5) {
        dateNow = (0, _gen.CallExpression)((0, _gen.MemberExpression)((0, _gen.MemberExpression)((0, _gen.MemberExpression)((0, _gen.Identifier)("Date"), (0, _gen.Literal)("prototype"), true), (0, _gen.Literal)("getTime"), true), (0, _gen.Literal)("call"), true), [(0, _gen.NewExpression)((0, _gen.Identifier)("Date"), [])]);
      }

      var test;
      var offset = 0;

      switch (type) {
        case "selfDefending":
          // A very simple mechanism inspired from https://github.com/javascript-obfuscator/javascript-obfuscator/blob/master/src/custom-code-helpers/self-defending/templates/SelfDefendingNoEvalTemplate.ts
          // regExp checks for a newline, formatters add these
          var callExpression = (0, _template.default)("\n            (\n              function(){\n                // Breaks JSNice.org, beautifier.io\n                var namedFunction = function(){\n                  const test = function(){\n                    const regExp=new RegExp('\\n');\n                    return regExp['test'](namedFunction)\n                  };\n                  return test()\n                }\n\n                return namedFunction();\n              }\n            )()\n            ").single().expression;
          nodes.push((0, _gen.IfStatement)(callExpression, this.getCounterMeasuresCode(object, parents) || [], null));
          break;

        case "startDate":
          test = (0, _gen.BinaryExpression)("<", dateNow, (0, _gen.Literal)(this.getTime(this.options.lock.startDate)));
          nodes.push((0, _gen.IfStatement)(test, this.getCounterMeasuresCode(object, parents) || [], null));
          break;

        case "endDate":
          test = (0, _gen.BinaryExpression)(">", dateNow, (0, _gen.Literal)(this.getTime(this.options.lock.endDate)));
          nodes.push((0, _gen.IfStatement)(test, this.getCounterMeasuresCode(object, parents) || [], null));
          break;

        case "context":
          var prop = (0, _random.choice)(this.options.lock.context);
          var code = this.getCounterMeasuresCode(object, parents) || []; // Todo: Alternative to `this`

          if (!this.globalVar) {
            offset = 1;
            this.globalVar = this.getPlaceholder();
            (0, _insert.prepend)(parents[parents.length - 1] || block, (0, _gen.VariableDeclaration)((0, _gen.VariableDeclarator)(this.globalVar, (0, _gen.LogicalExpression)("||", (0, _gen.Identifier)(this.options.globalVariables.keys().next().value), (0, _gen.ThisExpression)()))));
          }

          test = (0, _gen.UnaryExpression)("!", (0, _gen.MemberExpression)((0, _gen.Identifier)(this.globalVar), (0, _gen.Literal)(prop), true));
          nodes.push((0, _gen.IfStatement)(test, code, null));
          break;

        case "osLock":
          var navigatorUserAgent = (0, _template.default)("window.navigator.userAgent.toLowerCase()").single().expression;
          (0, _assert.ok)(this.options.lock.osLock);
          var code = this.getCounterMeasuresCode(object, parents) || [];
          this.options.lock.osLock.forEach(osName => {
            var agentMatcher = {
              windows: "Win",
              linux: "Linux",
              osx: "Mac",
              android: "Android",
              ios: "---"
            }[osName];
            var thisTest = (0, _gen.CallExpression)((0, _gen.MemberExpression)(navigatorUserAgent, (0, _gen.Literal)("match"), true), [(0, _gen.Literal)(agentMatcher.toLowerCase())]);

            if (osName == "ios" && this.options.target === "browser") {
              if (!this.iosDetectFn) {
                this.iosDetectFn = this.getPlaceholder();
                (0, _insert.prepend)(parents[parents.length - 1] || object, (0, _template.default)("function ".concat(this.iosDetectFn, "() {\n                  return [\n                    'iPad Simulator',\n                    'iPhone Simulator',\n                    'iPod Simulator',\n                    'iPad',\n                    'iPhone',\n                    'iPod'\n                  ].includes(navigator.platform)\n                  // iPad on iOS 13 detection\n                  || (navigator.userAgent.includes(\"Mac\") && \"ontouchend\" in document)\n                }")).single());
              }

              thisTest = (0, _gen.CallExpression)((0, _gen.Identifier)(this.iosDetectFn), []);
            }

            if (this.options.target === "node") {
              var platformName = {
                windows: "win32",
                osx: "darwin",
                ios: "darwin"
              }[osName] || osName;
              thisTest = (0, _template.default)("require('os').platform()===\"".concat(platformName, "\"")).single().expression;
            }

            if (!test) {
              test = thisTest;
            } else {
              test = (0, _gen.LogicalExpression)("||", { ...test
              }, thisTest);
            }
          });
          test = (0, _gen.UnaryExpression)("!", { ...test
          });
          nodes.push((0, _gen.IfStatement)(test, code, null));
          break;

        case "browserLock":
          var navigatorUserAgent = (0, _template.default)("window.navigator.userAgent.toLowerCase()").single().expression;
          (0, _assert.ok)(this.options.lock.browserLock);
          this.options.lock.browserLock.forEach(browserName => {
            var thisTest = (0, _gen.CallExpression)((0, _gen.MemberExpression)(navigatorUserAgent, (0, _gen.Literal)("match"), true), [(0, _gen.Literal)(browserName == "iexplorer" ? "msie" : browserName.toLowerCase())]);

            if (browserName === "safari") {
              thisTest = (0, _template.default)("/^((?!chrome|android).)*safari/i.test(navigator.userAgent)").single().expression;
            }

            if (!test) {
              test = thisTest;
            } else {
              test = (0, _gen.LogicalExpression)("||", { ...test
              }, thisTest);
            }
          });
          test = (0, _gen.UnaryExpression)("!", { ...test
          });
          nodes.push((0, _gen.IfStatement)(test, this.getCounterMeasuresCode(object, parents) || [], null));
          break;

        case "domainLock":
          function removeSlashes(path) {
            var count = path.length - 1;
            var index = 0;

            while (path.charCodeAt(index) === 47 && ++index);

            while (path.charCodeAt(count) === 47 && --count);

            return path.slice(index, count + 1);
          }

          var locationHref = (0, _gen.MemberExpression)((0, _gen.Identifier)("location"), (0, _gen.Literal)("href"), true);
          var random = (0, _random.choice)(this.options.lock.domainLock);

          if (random) {
            test = (0, _gen.CallExpression)((0, _gen.MemberExpression)(locationHref, (0, _gen.Literal)("match"), true), [{
              type: "Literal",
              regex: {
                pattern: random instanceof RegExp ? random.source : removeSlashes(random + ""),
                flags: random instanceof RegExp ? "" : ""
              }
            }]);
            test = (0, _gen.UnaryExpression)("!", test);

            if (Math.random() > 0.5) {
              test = (0, _gen.LogicalExpression)("||", (0, _gen.BinaryExpression)("==", (0, _gen.UnaryExpression)("typeof", (0, _gen.Identifier)("location")), (0, _gen.Literal)("undefined")), test);
            }

            nodes.push((0, _gen.IfStatement)(test, this.getCounterMeasuresCode(object, parents) || [], null));
          }

          break;
      }

      if (nodes.length) {
        var body = (0, _insert.getBlockBody)(block);
        var randomIndex = (0, _random.getRandomInteger)(0, body.length) + offset;

        if (randomIndex >= body.length) {
          body.push(...nodes);
        } else {
          body.splice(randomIndex, 0, ...nodes);
        }
      }
    };
  }

}

exports.default = Lock;