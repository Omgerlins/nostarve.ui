"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reservedKeywords = exports.reservedIdentifiers = exports.placeholderVariablePrefix = exports.noRenameVariablePrefix = void 0;

/**
 * Keywords disallowed for variable names in ES5 and under.
 */
const reservedKeywords = new Set(["abstract", "arguments", "await", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "debugger", "default", "delete", "do", "double", "else", "enum", "eval", "export", "extends", "false", "final", "finally", "float", "for", "function", "goto", "if", "implements", "import", "in", "instanceof", "int", "interface", "let", "long", "native", "new", "null", "package", "private", "protected", "public", "return", "short", "static", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "true", "try", "typeof", "var", "void", "volatile", "while", "with", "yield"]);
/**
 * Identifiers that are not actually variables.
 */

exports.reservedKeywords = reservedKeywords;
const reservedIdentifiers = new Set(["undefined", "null", "NaN", "Infinity", "eval", "arguments"]);
exports.reservedIdentifiers = reservedIdentifiers;
const noRenameVariablePrefix = "__NO_JS_CONFUSER_RENAME__";
exports.noRenameVariablePrefix = noRenameVariablePrefix;
const placeholderVariablePrefix = "__p_";
exports.placeholderVariablePrefix = placeholderVariablePrefix;