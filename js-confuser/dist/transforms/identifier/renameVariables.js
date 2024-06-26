"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _assert = require("assert");

var _order = require("../../order");

var _traverse = require("../../traverse");

var _identifiers = require("../../util/identifiers");

var _insert = require("../../util/insert");

var _transform = _interopRequireDefault(require("../transform"));

var _constants = require("../../constants");

var _probability = require("../../probability");

var _variableAnalysis = _interopRequireDefault(require("./variableAnalysis"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Rename variables to randomly generated names.
 *
 * - 1. First collect data on identifiers in all scope using 'VariableAnalysis'
 * - 2. After 'VariableAnalysis' is finished start applying to each scope (top-down)
 * - 3. Each scope, find the all names used here and exclude those names from being re-named
 * - 4. Now loop through all the defined names in this scope and set it to a random name (or re-use previously generated name)
 * - 5. Update all the Identifiers node's 'name' property to reflect this change
 */
class RenameVariables extends _transform.default {
  // Names already used
  // Map of Context->Object of changes
  // Ref to VariableAnalysis data
  // Option to re-use previously generated names
  constructor(o) {
    super(o, _order.ObfuscateOrder.RenameVariables);

    _defineProperty(this, "generated", void 0);

    _defineProperty(this, "changed", void 0);

    _defineProperty(this, "variableAnalysis", void 0);

    _defineProperty(this, "reusePreviousNames", true);

    this.changed = new Map(); // 1.

    this.variableAnalysis = new _variableAnalysis.default(o);
    this.before.push(this.variableAnalysis);
    this.generated = [];
  }

  match(object, parents) {
    return (0, _insert.isContext)(object) || object.type === "Identifier";
  }

  transformContext(object, parents) {
    // 2. Notice this is on 'onEnter' (top-down)
    var isGlobal = object.type == "Program";
    var type = isGlobal ? "root" : (0, _insert.isVarContext)(object) ? "var" : (0, _insert.isLexContext)(object) ? "lex" : undefined;
    (0, _assert.ok)(type);
    var newNames = Object.create(null);
    var defined = this.variableAnalysis.defined.get(object) || new Set();
    var references = this.variableAnalysis.references.get(object) || new Set(); // No changes needed here

    if (!defined && !this.changed.has(object)) {
      this.changed.set(object, Object.create(null));
      return;
    } // Names possible to be re-used here


    var possible = new Set(); // 3. Try to re-use names when possible

    if (this.reusePreviousNames && this.generated.length && !isGlobal) {
      var allReferences = new Set();
      var nope = new Set(defined);
      (0, _traverse.walk)(object, [], (o, p) => {
        var ref = this.variableAnalysis.references.get(o);

        if (ref) {
          ref.forEach(x => allReferences.add(x));
        }

        var def = this.variableAnalysis.defined.get(o);

        if (def) {
          def.forEach(x => allReferences.add(x));
        }
      });
      var passed = new Set();
      parents.forEach(p => {
        var changes = this.changed.get(p);

        if (changes) {
          Object.keys(changes).forEach(x => {
            var name = changes[x];

            if (!allReferences.has(x) && !references.has(x)) {
              passed.add(name);
            } else {
              nope.add(name);
            }
          });
        }
      });
      nope.forEach(x => passed.delete(x));
      possible = passed;
    } // 4. Defined names to new names


    for (var name of defined) {
      if (!name.startsWith(_constants.noRenameVariablePrefix) && ( // Variables prefixed with '__NO_JS_CONFUSER_RENAME__' are never renamed
      isGlobal && !name.startsWith(_constants.placeholderVariablePrefix) // Variables prefixed with '__p_' are created by the obfuscator, always renamed
      ? (0, _probability.ComputeProbabilityMap)(this.options.renameGlobals, x => x, name) : true) && (0, _probability.ComputeProbabilityMap)( // Check the user's option for renaming variables
      this.options.renameVariables, x => x, name, isGlobal)) {
        // Create a new name from (1) or (2) methods
        var newName;

        do {
          if (possible.size) {
            // (1) Re-use previously generated name
            var first = possible.values().next().value;
            possible.delete(first);
            newName = first;
          } else {
            // (2) Create a new name with `generateIdentifier` function
            var generatedName = this.generateIdentifier();
            newName = generatedName;
            this.generated.push(generatedName);
          }
        } while (this.variableAnalysis.globals.has(newName)); // Ensure global names aren't overridden


        newNames[name] = newName;
      } else {
        // This variable name was deemed not to be renamed.
        newNames[name] = name;
      }
    } // console.log(object.type, newNames);


    this.changed.set(object, newNames);
  }

  transformIdentifier(object, parents) {
    const identifierName = object.name;

    if (_constants.reservedIdentifiers.has(identifierName) || this.options.globalVariables.has(identifierName)) {
      return;
    }

    if (object.$renamed) {
      return;
    }

    var info = (0, _identifiers.getIdentifierInfo)(object, parents);

    if (info.spec.isExported) {
      return;
    }

    if (!info.spec.isReferenced) {
      return;
    }

    var contexts = [object, ...parents].filter(x => (0, _insert.isContext)(x));
    var newName = null; // Function default parameter check!

    var functionIndices = [];

    for (var i in parents) {
      if ((0, _insert.isFunction)(parents[i])) {
        functionIndices.push(i);
      }
    }

    for (var functionIndex of functionIndices) {
      if (parents[functionIndex].id === object) {
        // This context is not referenced, so remove it
        contexts = contexts.filter(context => context != parents[functionIndex]);
        continue;
      }

      if (parents[functionIndex].params === parents[functionIndex - 1]) {
        var isReferencedHere = true;
        var slicedParents = parents.slice(0, functionIndex);
        var forIndex = 0;

        for (var parent of slicedParents) {
          var childNode = slicedParents[forIndex - 1] || object;

          if (parent.type === "AssignmentPattern" && parent.right === childNode) {
            isReferencedHere = false;
            break;
          }

          forIndex++;
        }

        if (!isReferencedHere) {
          // This context is not referenced, so remove it
          contexts = contexts.filter(context => context != parents[functionIndex]);
        }
      }
    }

    for (var check of contexts) {
      if (this.variableAnalysis.defined.has(check) && this.variableAnalysis.defined.get(check).has(identifierName)) {
        if (this.changed.has(check) && this.changed.get(check)[identifierName]) {
          newName = this.changed.get(check)[identifierName];
          break;
        }
      }
    }

    if (newName && typeof newName === "string") {
      // Strange behavior where the `local` and `imported` objects are the same
      if (info.isImportSpecifier) {
        var importSpecifierIndex = parents.findIndex(x => x.type === "ImportSpecifier");

        if (importSpecifierIndex != -1 && parents[importSpecifierIndex].imported === (parents[importSpecifierIndex - 1] || object) && parents[importSpecifierIndex].imported && parents[importSpecifierIndex].imported.type === "Identifier") {
          parents[importSpecifierIndex].imported = (0, _insert.clone)(parents[importSpecifierIndex - 1] || object);
        }
      } // console.log(o.name, "->", newName);
      // 5. Update Identifier node's 'name' property


      object.name = newName;
      object.$renamed = true;
    }
  }

  transform(object, parents) {
    var matchType = object.type === "Identifier" ? "Identifier" : "Context";

    if (matchType === "Identifier") {
      this.transformIdentifier(object, parents);
    } else {
      this.transformContext(object, parents);
    }
  }

}

exports.default = RenameVariables;