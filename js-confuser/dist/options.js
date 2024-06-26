"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.correctOptions = correctOptions;
exports.validateOptions = validateOptions;

var _assert = require("assert");

var _presets = _interopRequireDefault(require("./presets"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const validProperties = new Set(["preset", "target", "indent", "compact", "hexadecimalNumbers", "minify", "es5", "renameVariables", "renameGlobals", "identifierGenerator", "controlFlowFlattening", "globalConcealing", "stringCompression", "stringConcealing", "stringEncoding", "stringSplitting", "duplicateLiteralsRemoval", "dispatcher", "rgf", "objectExtraction", "flatten", "deadCode", "calculator", "lock", "movedDeclarations", "opaquePredicates", "shuffle", "stack", "verbose", "globalVariables", "debugComments"]);
const validOses = new Set(["windows", "linux", "osx", "ios", "android"]);
const validBrowsers = new Set(["firefox", "chrome", "iexplorer", "edge", "safari", "opera"]);

function validateOptions(options) {
  if (!options || Object.keys(options).length <= 1) {
    /**
     * Give a welcoming introduction to those who skipped the documentation.
     */
    var line = "You provided zero obfuscation options. By default everything is disabled.\nYou can use a preset with:\n\n> {target: '".concat(options.target || "node", "', preset: 'high' | 'medium' | 'low'}.\n\n\nView all settings here:\nhttps://github.com/MichaelXF/js-confuser#options");
    throw new Error("\n\n" + line.split("\n").map(x => "\t".concat(x)).join("\n") + "\n\n");
  }

  (0, _assert.ok)(options, "options cannot be null");
  (0, _assert.ok)(options.target, "Missing options.target option (required, must one the following: 'browser' or 'node')");
  (0, _assert.ok)(["browser", "node"].includes(options.target), "'".concat(options.target, "' is not a valid target mode"));
  Object.keys(options).forEach(key => {
    if (!validProperties.has(key)) {
      throw new TypeError("Invalid option: '" + key + "'");
    }
  });

  if (options.target === "node" && options.lock && options.lock.browserLock && options.lock.browserLock.length) {
    throw new TypeError('browserLock can only be used when target="browser"');
  }

  if (options.lock) {
    // Validate browser-lock option
    if (options.lock.browserLock && typeof options.lock.browserLock !== "undefined") {
      (0, _assert.ok)(Array.isArray(options.lock.browserLock), "browserLock must be an array");
      (0, _assert.ok)(!options.lock.browserLock.find(browserName => !validBrowsers.has(browserName)), 'Invalid browser name. Allowed: "firefox", "chrome", "iexplorer", "edge", "safari", "opera"');
    } // Validate os-lock option


    if (options.lock.osLock && typeof options.lock.osLock !== "undefined") {
      (0, _assert.ok)(Array.isArray(options.lock.osLock), "osLock must be an array");
      (0, _assert.ok)(!options.lock.osLock.find(osName => !validOses.has(osName)), 'Invalid OS name. Allowed: "windows", "linux", "osx", "ios", "android"');
    } // Validate domain-lock option


    if (options.lock.domainLock && typeof options.lock.domainLock !== "undefined") {
      (0, _assert.ok)(Array.isArray(options.lock.domainLock), "domainLock must be an array");
    } // Validate context option


    if (options.lock.context && typeof options.lock.context !== "undefined") {
      (0, _assert.ok)(Array.isArray(options.lock.context), "context must be an array");
    } // Validate start-date option


    if (typeof options.lock.startDate !== "undefined" && options.lock.startDate) {
      (0, _assert.ok)(typeof options.lock.startDate === "number" || options.lock.startDate instanceof Date, "startDate must be Date object or number");
    } // Validate end-date option


    if (typeof options.lock.endDate !== "undefined" && options.lock.endDate) {
      (0, _assert.ok)(typeof options.lock.endDate === "number" || options.lock.endDate instanceof Date, "endDate must be Date object or number");
    }
  }

  if (options.preset) {
    if (!_presets.default[options.preset]) {
      throw new TypeError("Unknown preset of '" + options.preset + "'");
    }
  }
}
/**
 * Corrects the user's options. Sets the default values and validates the configuration.
 * @param options
 * @returns
 */


async function correctOptions(options) {
  if (options.preset) {
    // Clone and allow overriding
    options = Object.assign({}, _presets.default[options.preset], options);
  }

  if (!options.hasOwnProperty("debugComments")) {
    options.debugComments = false; // debugComments is off by default
  }

  if (!options.hasOwnProperty("compact")) {
    options.compact = true; // Compact is on by default
  }

  if (!options.hasOwnProperty("renameGlobals")) {
    options.renameGlobals = true; // RenameGlobals is on by default
  }

  if (options.globalVariables && !(options.globalVariables instanceof Set)) {
    options.globalVariables = new Set(Object.keys(options.globalVariables));
  }

  if (options.lock && options.lock.selfDefending) {
    options.compact = true; // self defending forcibly enables this
  } // options.globalVariables outlines generic globals that should be present in the execution context


  if (!options.hasOwnProperty("globalVariables")) {
    options.globalVariables = new Set([]);

    if (options.target == "browser") {
      // browser
      ["window", "document", "postMessage", "alert", "confirm", "location", "btoa", "atob", "unescape", "encodeURIComponent"].forEach(x => options.globalVariables.add(x));
    } else {
      // node
      ["global", "Buffer", "require", "process", "exports", "module", "__dirname", "__filename"].forEach(x => options.globalVariables.add(x));
    }

    ["globalThis", "console", "parseInt", "parseFloat", "Math", "JSON", "Promise", "String", "Boolean", "Function", "Object", "Array", "Proxy", "Error", "TypeError", "ReferenceError", "RangeError", "EvalError", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate", "queueMicrotask", "isNaN", "isFinite", "Set", "Map", "WeakSet", "WeakMap", "Symbol"].forEach(x => options.globalVariables.add(x));
  }

  return options;
}