"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _assert = require("assert");

var _events = require("events");

var _traverse = _interopRequireDefault(require("./traverse"));

var _probability = require("./probability");

var _preparation = _interopRequireDefault(require("./transforms/preparation"));

var _objectExtraction = _interopRequireDefault(require("./transforms/extraction/objectExtraction"));

var _lock = _interopRequireDefault(require("./transforms/lock/lock"));

var _dispatcher = _interopRequireDefault(require("./transforms/dispatcher"));

var _deadCode = _interopRequireDefault(require("./transforms/deadCode"));

var _opaquePredicates = _interopRequireDefault(require("./transforms/opaquePredicates"));

var _calculator = _interopRequireDefault(require("./transforms/calculator"));

var _controlFlowFlattening = _interopRequireDefault(require("./transforms/controlFlowFlattening/controlFlowFlattening"));

var _globalConcealing = _interopRequireDefault(require("./transforms/identifier/globalConcealing"));

var _stringSplitting = _interopRequireDefault(require("./transforms/string/stringSplitting"));

var _stringConcealing = _interopRequireDefault(require("./transforms/string/stringConcealing"));

var _stringCompression = _interopRequireDefault(require("./transforms/string/stringCompression"));

var _duplicateLiteralsRemoval = _interopRequireDefault(require("./transforms/extraction/duplicateLiteralsRemoval"));

var _shuffle = _interopRequireDefault(require("./transforms/shuffle"));

var _movedDeclarations = _interopRequireDefault(require("./transforms/identifier/movedDeclarations"));

var _renameVariables = _interopRequireDefault(require("./transforms/identifier/renameVariables"));

var _renameLabels = _interopRequireDefault(require("./transforms/renameLabels"));

var _minify = _interopRequireDefault(require("./transforms/minify"));

var _es = _interopRequireDefault(require("./transforms/es5/es5"));

var _rgf = _interopRequireDefault(require("./transforms/rgf"));

var _flatten = _interopRequireDefault(require("./transforms/flatten"));

var _stack = _interopRequireDefault(require("./transforms/stack"));

var _antiTooling = _interopRequireDefault(require("./transforms/antiTooling"));

var _finalizer = _interopRequireDefault(require("./transforms/finalizer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * The parent transformation holding the `state`.
 */
class Obfuscator extends _events.EventEmitter {
  constructor(options) {
    var _this;

    super();
    _this = this;
    this.options = options;

    _defineProperty(this, "varCount", void 0);

    _defineProperty(this, "transforms", void 0);

    _defineProperty(this, "array", void 0);

    _defineProperty(this, "state", "transform");

    _defineProperty(this, "generated", void 0);

    _defineProperty(this, "totalPossibleTransforms", void 0);

    this.varCount = 0;
    this.transforms = Object.create(null);
    this.generated = new Set();
    this.totalPossibleTransforms = 0;

    const test = function (map) {
      for (var _len = arguments.length, transformers = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        transformers[_key - 1] = arguments[_key];
      }

      _this.totalPossibleTransforms += transformers.length;

      if ((0, _probability.isProbabilityMapProbable)(map)) {
        // options.verbose && console.log("+ Added " + transformer.name);
        transformers.forEach(Transformer => _this.push(new Transformer(_this)));
      } else {// options.verbose && console.log("- Skipped adding " + transformer.name);
      }
    }; // Optimization: Only add needed transformers. If a probability always return false, no need in running that extra code.


    test(true, _preparation.default);
    test(true, _renameLabels.default);
    test(options.objectExtraction, _objectExtraction.default);
    test(options.flatten, _flatten.default);
    test(options.rgf, _rgf.default);
    test(options.dispatcher, _dispatcher.default);
    test(options.deadCode, _deadCode.default);
    test(options.calculator, _calculator.default);
    test(options.controlFlowFlattening, _controlFlowFlattening.default);
    test(options.globalConcealing, _globalConcealing.default);
    test(options.opaquePredicates, _opaquePredicates.default);
    test(options.stringSplitting, _stringSplitting.default);
    test(options.stringConcealing, _stringConcealing.default);
    test(options.stringCompression, _stringCompression.default);
    test(options.stack, _stack.default);
    test(options.duplicateLiteralsRemoval, _duplicateLiteralsRemoval.default);
    test(options.shuffle, _shuffle.default);
    test(options.movedDeclarations, _movedDeclarations.default);
    test(options.minify, _minify.default);
    test(options.renameVariables, _renameVariables.default);
    test(options.es5, _es.default);
    test(true, _antiTooling.default);
    test(true, _finalizer.default); // String Encoding, Hexadecimal Numbers, BigInt support is included

    if (options.lock && Object.keys(options.lock).filter(x => x == "domainLock" ? options.lock.domainLock && options.lock.domainLock.length : options.lock[x]).length) {
      test(true, _lock.default);
    } // Make array


    this.array = Object.values(this.transforms); // Sort transformations based on their priority

    this.array.sort((a, b) => a.priority - b.priority);
  }

  push(transform) {
    if (transform.className) {
      (0, _assert.ok)(!this.transforms[transform.className], "Already have " + transform.className);
    }

    this.transforms[transform.className] = transform;
  }

  resetState() {
    this.varCount = 0;
    this.generated = new Set();
    this.state = "transform";
  }

  async apply(tree) {
    let debugMode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    (0, _assert.ok)(tree.type == "Program", "The root node must be type 'Program'");
    (0, _assert.ok)(Array.isArray(tree.body), "The root's body property must be an array");
    (0, _assert.ok)(Array.isArray(this.array));
    this.resetState();
    var completed = 0;

    for (var transform of this.array) {
      await transform.apply(tree);
      completed++;

      if (debugMode) {
        this.emit("debug", transform.className, tree, completed);
      }
    }

    if (this.options.verbose) {
      console.log("-> Check for Eval Callbacks");
    }

    this.state = "eval"; // Find eval callbacks

    (0, _traverse.default)(tree, (o, p) => {
      if (o.$eval) {
        return () => {
          o.$eval(o, p);
        };
      }
    });

    if (this.options.verbose) {
      console.log("<- Done");
    }
  }

}

exports.default = Obfuscator;