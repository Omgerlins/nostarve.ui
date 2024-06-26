"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Template;

var _parser = require("../parser");

function Template(template) {
  var neededVariables = 0;

  while (template.includes("{$".concat(neededVariables + 1, "}"))) {
    neededVariables++;
  }

  var vars = Object.create(null);
  new Array(neededVariables + 1).fill(0).forEach((x, i) => {
    vars["\\$" + i] = "if" + i;
  });

  function fill(variables) {
    if (!variables) {
      variables = Object.create(null);
    }

    var cloned = template;
    var keys = { ...variables,
      ...vars
    };
    Object.keys(keys).forEach(name => {
      var bracketName = "{" + name + "}";
      var value = keys[name] + "";
      var reg = new RegExp(bracketName, "g");
      cloned = cloned.replace(reg, value);
    });
    return cloned;
  }

  function compile(variables) {
    var code = fill(variables);

    try {
      var program = (0, _parser.parseSnippet)(code);
      return program.body;
    } catch (e) {
      console.error(e);
      console.error(template);
      throw new Error("Template failed to parse");
    }
  }

  function single(variables) {
    var nodes = compile(variables);
    return nodes[0];
  }

  var obj = {
    fill,
    compile,
    single,
    source: template
  };
  return obj;
}