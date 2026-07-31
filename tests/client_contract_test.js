"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameSource = fs.readFileSync(
  path.join(__dirname, "..", "modules", "js", "Game.js"),
  "utf8"
);

assert.match(
  gameSource,
  /gamestate\.args\s*=\s*Object\.assign\(\{\},\s*normalizedArgs\)/,
  "Entering a state must replace the previous args snapshot."
);
assert.doesNotMatch(
  gameSource,
  /Object\.assign\(\s*\{\},\s*this\.gamedatas\.gamestate\.args\s*\|\|\s*\{\},\s*normalizedArgs/,
  "State args must not merge keys left by the previous state."
);

console.log("Client contract tests passed.");
