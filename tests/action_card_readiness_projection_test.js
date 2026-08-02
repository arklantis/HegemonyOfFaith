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
      "ActionCardReadinessProjection.js"
    ),
    "utf8"
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}

async function main() {
  const { projectActionCardReadiness } = await loadProjectionModule();

  const defenseFocus = projectActionCardReadiness({
    cardKeys: ["firm_faith", "faith_war"],
    focusDefenseCardKey: "firm_faith",
    believerSelection: true,
  });
  assert.deepEqual(defenseFocus, [
    { key: "firm_faith", enabled: true, reason: "" },
    { key: "faith_war", enabled: false, reason: "defense_focus" },
  ]);

  const waiting = projectActionCardReadiness({
    cardKeys: ["faith_war"],
    waitingForAoe: true,
  });
  assert.equal(waiting[0].reason, "aoe_waiting");

  const normalTurn = projectActionCardReadiness({
    cardKeys: [
      "firm_faith",
      "faith_war",
      "spread_rumors",
      "karboom",
      "divine_inspire",
    ],
    playerTurnRules: true,
    mySectHasBelievers: false,
    selectableTargetKeys: ["spread_rumors"],
    attackLocked: true,
    turnActionMask: 0b01000,
    actionTypeMasks: {
      faith_war: 0b00100,
      spread_rumors: 0b01000,
      karboom: 0b00010,
      divine_inspire: 0b00001,
    },
  });
  assert.deepEqual(
    normalTurn.map(function (card) {
      return card.reason;
    }),
    [
      "defense_standby",
      "no_sect_believers",
      "action_type_used",
      "attack_locked",
      "",
    ]
  );

  const noTarget = projectActionCardReadiness({
    cardKeys: ["kowtow_to_me"],
    playerTurnRules: true,
    mySectHasBelievers: true,
    selectableTargetKeys: [],
  });
  assert.equal(noTarget[0].reason, "no_target");

  const repeatBypass = projectActionCardReadiness({
    cardKeys: ["spread_rumors"],
    playerTurnRules: true,
    mySectHasBelievers: true,
    selectableTargetKeys: ["spread_rumors"],
    turnActionMask: 0b01000,
    repeatBypass: 1,
    actionTypeMasks: { spread_rumors: 0b01000 },
  });
  assert.equal(repeatBypass[0].enabled, true);

  const viewOnlyState = projectActionCardReadiness({
    cardKeys: ["faith_war"],
  });
  assert.equal(viewOnlyState[0].enabled, true);

  console.log("Action-card readiness projection tests passed.");
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
