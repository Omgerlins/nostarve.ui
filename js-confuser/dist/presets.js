"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * - High Obfuscation preset.
 * - **Average 90% performance reduction.**
 *
 * ## **`Enabled features`**
 * 1. Variable renaming
 * 2. Control flow obfuscation
 * 3. String concealing
 * 4. Opaque predicates
 * 5. Dead code
 * 6. Dispatcher
 * 7. Moved declarations
 * 8. Object extraction
 * 9. Global concealing
 * 10. Minified output
 *
 * ## **`Disabled features`**
 * - `rgf` Use at your own risk!
 *
 * ### Potential Issues
 * 1. *String Encoding* can corrupt files. Disable `stringEncoding` manually if this happens.
 * 2. *Dead Code* can bloat file size. Reduce or disable `deadCode`.
 */
const highPreset = {
  target: "node",
  preset: "high",
  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  controlFlowFlattening: 0.75,
  deadCode: 0.2,
  dispatcher: true,
  duplicateLiteralsRemoval: 0.75,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.75,
  renameVariables: true,
  renameGlobals: true,
  shuffle: {
    hash: 0.5,
    true: 0.5
  },
  stack: true,
  stringConcealing: true,
  stringCompression: true,
  stringEncoding: true,
  stringSplitting: 0.75,
  // Use at own risk
  rgf: false
};
/**
 * - Medium Obfuscation preset.
 * - Average 50% performance reduction.
 */

const mediumPreset = {
  target: "node",
  preset: "medium",
  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  controlFlowFlattening: 0.25,
  deadCode: 0.025,
  dispatcher: 0.5,
  duplicateLiteralsRemoval: 0.5,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.5,
  renameVariables: true,
  renameGlobals: true,
  shuffle: true,
  stack: 0.5,
  stringConcealing: true,
  stringSplitting: 0.25
};
/**
 * - Low Obfuscation preset.
 * - Average 30% performance reduction.
 */

const lowPreset = {
  target: "node",
  preset: "low",
  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  controlFlowFlattening: 0.1,
  deadCode: 0.01,
  dispatcher: 0.25,
  duplicateLiteralsRemoval: 0.5,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.1,
  renameVariables: true,
  renameGlobals: true,
  stringConcealing: true
};
/**
 * Built-in obfuscator presets.
 */

const presets = {
  high: highPreset,
  medium: mediumPreset,
  low: lowPreset
};
var _default = presets;
exports.default = _default;