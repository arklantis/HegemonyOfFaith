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

assert.match(
  gameSource,
  /confrontation_id:\s*confrontationId/,
  "Persisted duel history must include its confrontation identity."
);
assert.match(
  gameSource,
  /parseInt\(payload\.confrontation_id\s*\|\|\s*0,\s*10\)\s*!==\s*expectedConfrontationId/,
  "Duel history must only restore into the confrontation that created it."
);

assert.doesNotMatch(
  gameSource,
  /const believerCountElem = dojo\.byId\("table_believer_count_" \+ actorId\);/,
  "Believer draw animations must not change the public count before cards land."
);
assert.doesNotMatch(
  gameSource,
  /table_believer_count_[\s\S]{0,200}parseInt\(countElem\.innerHTML\) \+ notif\.args\.cards\.length/,
  "Private hand sync must not increment the public count ahead of the effect."
);
assert.match(
  gameSource,
  /visualBusyDelay[\s\S]{0,300}getTableAnimationBusyMs/,
  "Authoritative public counts must wait for the current visual effect."
);

assert.match(
  gameSource,
  /lockAllHandStocks:\s*function \(\)[\s\S]{0,300}\["playerActionCards", "playerBelieverCards", "playerSkillCards"\]/,
  "The solo-turn hard lock must also disable Skill-card interaction."
);

console.log("Client contract tests passed.");
