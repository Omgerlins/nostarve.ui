"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.NameMappingAnalysis = void 0;

var _constants = require("../../constants");
var getChar = require("../../../../../client/minifier/minifier").generateChar
var _identifiers = require("../../util/identifiers");

var _transform = _interopRequireDefault(require("../transform"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class NameMappingAnalysis extends _transform.default {
  constructor(o) {
    super(o);

    _defineProperty(this, "names", void 0);

    this.names = new Map();
  }

  match(object, parents) {
    return object.type == "Identifier" && !_constants.reservedIdentifiers.has(object.name);
  }

  transform(object, parents) {
    var info = (0, _identifiers.getIdentifierInfo)(object, parents);

    if (info.spec.isReferenced && !info.spec.isDefined) {
      object.$definedAt = (0, _identifiers.getDefiningIdentifier)(object, parents);
    }

    if (info.spec.isDefined) {
      if (!this.names.has(object.name)) {
        this.names.set(object.name, new Set([object]));
      } else {
        this.names.get(object.name).add(object);
      }
    }
  }

}
/**
 * Renames variables & removes conflicts.
 *
 * - This helps transformations like `Dispatcher` not replace re-declared identifiers.
 */


exports.NameMappingAnalysis = NameMappingAnalysis;

class NameConflicts extends _transform.default {
  constructor(o) {
    super(o);

    _defineProperty(this, "nameMappingAnalysis", void 0);

    _defineProperty(this, "changes", void 0);

    _defineProperty(this, "references", void 0);

    this.before.push(this.nameMappingAnalysis = new NameMappingAnalysis(o));
    this.changes = new Map();
    this.references = new Map();
  }

  match(object, parents) {
    return object.type == "Identifier" && !_constants.reservedIdentifiers.has(object.name) && !this.options.globalVariables.has(object.name);
  }

  transform(object, parents) {
    var info = (0, _identifiers.getIdentifierInfo)(object, parents);

    if (info.isMethodDefinition) {
      return;
    }

    if (object.$definedAt) {
      object.name = this.changes.get(object.$definedAt[0]) || object.name;

      if (!this.references.has(object.$definedAt[0])) {
        this.references.set(object.$definedAt[0], new Set([object]));
      } else {
        this.references.get(object.$definedAt[0]).add(object);
      }
    } else if (info.spec.isDefined) {
      var set = this.nameMappingAnalysis.names.get(object.name);

      if (set && set.size > 1) {
        var index = Array.from(set).indexOf(object);
        var newName =  "_".repeat(index) + object.name;

        if (index > 4 || this.nameMappingAnalysis.names.has(newName)) {
          newName = this.getPlaceholder() + "_" + object.name;
        }

        object.name = newName;
        this.changes.set(object, newName);

        if (this.references.has(object)) {
          this.references.get(object).forEach(ref => {
            ref.name = newName;
          });
        }
      }
    }
  }

}

exports.default = NameConflicts;