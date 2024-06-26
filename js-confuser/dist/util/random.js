"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.alphabeticalGenerator = alphabeticalGenerator;
exports.chance = chance;
exports.choice = choice;
exports.getRandom = getRandom;
exports.getRandomFalseExpression = getRandomFalseExpression;
exports.getRandomInteger = getRandomInteger;
exports.getRandomString = getRandomString;
exports.getRandomTrueExpression = getRandomTrueExpression;
exports.shuffle = shuffle;
exports.splitIntoChunks = splitIntoChunks;

var _assert = require("assert");

var _gen = require("./gen");
let generateChar;

import("../../../../obfuscator/obfuscator.js").then(a => {
  generateChar = a.generateChar;
});
/**
 * Returns a random element from the given array
 * @param choices Array of items
 * @returns One of the items in the array at random
 */
function choice(choices) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}
/**
 * Returns a true/false based on the percent chance (0%-100%)
 * @param percentChance AS A PERCENTAGE 0 - 100%
 */


function chance(percentChance) {
  return Math.random() < percentChance / 100;
}
/**
 * **Mutates the given array**
 * @param array
 */


function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
  return array;
}
/**
 * Returns a random string.
 */


function getRandomString(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInteger(min, max) {
  return Math.floor(getRandom(min, max));
}

function splitIntoChunks(str, size) {
  (0, _assert.ok)(typeof str === "string", "str must be typeof string");
  (0, _assert.ok)(typeof size === "number", "size must be typeof number");
  (0, _assert.ok)(Math.floor(size) === size, "size must be integer");
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}
/**
 * Returns a random expression that will test to `false`.
 */


function getRandomFalseExpression() {
  var type = choice(["0", "false", "null", "undefined", "NaN", "emptyString"]);

  switch (type) {
    case "0":
      return (0, _gen.Literal)(0);

    case "false":
      return (0, _gen.Literal)(false);

    case "null":
      return (0, _gen.Identifier)("null");

    case "undefined":
      return (0, _gen.Identifier)("undefined");

    case "NaN":
      return (0, _gen.Identifier)("NaN");

    default:
      // case "emptyString":
      return (0, _gen.Literal)("");
  }
}
/**
 * Returns a random expression that will test to `true`
 */


function getRandomTrueExpression() {
  var type = choice(["number", "true", "Infinity", "nonEmptyString", "array", "object"]);

  switch (type) {
    case "number":
      return (0, _gen.Literal)(getRandomInteger(1, 100));

    case "true":
      return (0, _gen.Identifier)("true");

    case "Infinity":
      return (0, _gen.Identifier)("Infinity");

    case "nonEmptyString":
      return (0, _gen.Literal)(getRandomString(getRandomInteger(3, 9)));

    case "array":
      return (0, _gen.ArrayExpression)([]);

    default:
      //case "object":
      return (0, _gen.ObjectExpression)([]);
  }
}

function alphabeticalGenerator(index) {
  // let name = "";
  //
  // while (index > 0) {
  //   var t = (index - 1) % 52;
  //   var thisChar = t >= 26 ? String.fromCharCode(65 + t - 26) : String.fromCharCode(97 + t);
  //   name = thisChar + name;
  //   index = (index - t) / 52 | 0;
  // }
  //
  // if (!name) {
  //   name = "_";
  // }


  return generateChar();
}