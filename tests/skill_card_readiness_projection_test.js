"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function loadProjectionModule() {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "modules",
      "js",
      "SkillCardReadinessProjection.js"
    ),
    "utf8"
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}

async function main() {
  const { projectSkillCardReadiness } = await loadProjectionModule();

  assert.deepEqual(
    projectSkillCardReadiness({
      stateName: "playerTurn",
      localCanAct: true,
      useSkillActionAvailable: true,
    }),
    { selectable: true, selectionMode: 1, reason: "available" }
  );
  assert.equal(
    projectSkillCardReadiness({
      stateName: "playerTurn",
      localCanAct: false,
      useSkillActionAvailable: true,
    }).reason,
    "remote_turn"
  );
  assert.equal(
    projectSkillCardReadiness({
      stateName: "playerTurn",
      localCanAct: true,
      useSkillActionAvailable: true,
      actionSubmissionInFlight: true,
    }).reason,
    "submitting"
  );
  assert.equal(
    projectSkillCardReadiness({
      stateName: "playerTurn",
      localCanAct: true,
      useSkillActionAvailable: true,
      discardMode: true,
    }).reason,
    "discard_mode"
  );
  assert.equal(
    projectSkillCardReadiness({
      stateName: "playerTurn",
      localCanAct: true,
      praiseLifeDecisionPending: true,
      skillCanUse: true,
    }).selectable,
    true
  );
  assert.equal(
    projectSkillCardReadiness({
      stateName: "playerTurn",
      localCanAct: true,
      skillCanUse: true,
    }).selectable,
    false
  );
  assert.equal(
    projectSkillCardReadiness({
      stateName: "confirmDefense",
      localCanAct: true,
      useSkillActionAvailable: true,
    }).reason,
    "inactive_state"
  );

  console.log("Skill-card readiness projection tests passed.");
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
