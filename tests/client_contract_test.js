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

const actionButtonOwnershipBlock = gameSource.match(
  /const canRenderCurrentStateButtons =[\s\S]*?if \(stateName === "chooseInitialSkill"\)/
);
assert.ok(
  actionButtonOwnershipBlock,
  "The action-button ownership gate must remain identifiable."
);
assert.doesNotMatch(
  actionButtonOwnershipBlock[0],
  /isCurrentPlayerActive\(\)/,
  "Action-button ownership must use the shared interaction projection."
);
assert.match(
  gameSource,
  /onUseSkillButtonClicked:[\s\S]{0,1200}getTurnInteractionProjection\("playerTurn"\)\.localCanAct/,
  "Direct Skill use must use the shared interaction projection fallback."
);
assert.doesNotMatch(
  gameSource,
  /soloBotOwnsActiveState:\s*function/,
  "The obsolete solo-only ownership facade must not return."
);
assert.match(
  gameSource,
  /import \{ projectActionCardReadiness \} from "\.\/ActionCardReadinessProjection\.js";/,
  "Action-card readiness must use the pure projection module."
);
assert.match(
  gameSource,
  /const readiness = projectActionCardReadiness\(\{/,
  "The Action-card DOM adapter must delegate its policy decision."
);
assert.doesNotMatch(
  gameSource,
  /const targetRequiredCards = \{/,
  "Action-card policy lists must not return to the DOM adapter."
);
assert.match(
  gameSource,
  /import \{ projectBelieverCardReadiness \} from "\.\/BelieverCardReadinessProjection\.js";/,
  "Believer-card readiness must use the pure projection module."
);
assert.match(
  gameSource,
  /getBelieverCardReadinessProjection:\s*function[\s\S]{0,1200}projectBelieverCardReadiness\(\{/,
  "The Believer-card adapter must delegate its policy decision."
);
assert.doesNotMatch(
  gameSource,
  /shouldBelieverHandBeReady:\s*function/,
  "The old distributed Believer-readiness policy must not return."
);
assert.match(
  gameSource,
  /import \{ projectSkillCardReadiness \} from "\.\/SkillCardReadinessProjection\.js";/,
  "Skill-card readiness must use the pure projection module."
);
assert.match(
  gameSource,
  /const skillCardReadiness = projectSkillCardReadiness\(\{/,
  "Skill-card selection mode must delegate to the shared projection."
);

console.log("Client contract tests passed.");
