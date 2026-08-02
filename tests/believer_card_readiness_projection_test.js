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
      "BelieverCardReadinessProjection.js"
    ),
    "utf8"
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}

async function main() {
  const { projectBelieverCardReadiness } = await loadProjectionModule();

  [
    "resolveDuel",
    "resolveFaithDebateDuel",
    "reverseKarmaPrompt",
    "faithWarDuel",
    "faithDebateDuel",
  ].forEach(function (stateName) {
    assert.deepEqual(projectBelieverCardReadiness({ stateName }), {
      ready: true,
      reason: "confrontation_visual",
    });
  });

  assert.deepEqual(
    projectBelieverCardReadiness({
      stateName: "leaderGiveBeliever",
      localCanAct: true,
      canGiveBeliever: true,
    }),
    { ready: true, reason: "give_believer" }
  );
  assert.equal(
    projectBelieverCardReadiness({
      stateName: "leaderGiveBeliever",
      localCanAct: false,
      canGiveBeliever: true,
    }).ready,
    false
  );

  assert.deepEqual(
    projectBelieverCardReadiness({
      stateName: "conspiracyChooseBelievers",
      canCommitAoeBeliever: true,
    }),
    { ready: true, reason: "aoe_commit" }
  );
  assert.equal(
    projectBelieverCardReadiness({
      stateName: "martyrdomChooseBelievers",
      canCommitAoeBeliever: false,
    }).ready,
    false
  );

  [2, 7, 8, 13].forEach(function (pendingSkillType) {
    assert.equal(
      projectBelieverCardReadiness({
        stateName: "playerTurn",
        hasPendingSkill: true,
        pendingSkillType,
      }).reason,
      "skill_sacrifice"
    );
  });
  assert.equal(
    projectBelieverCardReadiness({
      stateName: "playerTurn",
      hasPendingSkill: true,
      pendingSkillType: 9,
    }).ready,
    false
  );
  assert.equal(
    projectBelieverCardReadiness({
      stateName: "playerTurn",
      hasPendingSkill: true,
      pendingSkillType: 2,
      actionSubmissionInFlight: true,
    }).ready,
    false
  );

  console.log("Believer-card readiness projection tests passed.");
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
