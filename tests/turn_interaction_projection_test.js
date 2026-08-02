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
      "TurnInteractionProjection.js"
    ),
    "utf8"
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}

async function main() {
  const { projectTurnInteraction } = await loadProjectionModule();

  const localTurn = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [],
  });
  assert.deepEqual(localTurn, {
    mode: "local",
    actorId: 10,
    activeActorIds: [10],
    localCanAct: true,
    soloBotOwnsState: false,
    lockHandStocks: false,
    suppressFrameworkTurnBanner: false,
  });

  const remoteTurn = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 20,
    soloBotPlayerIds: [],
  });
  assert.equal(remoteTurn.mode, "remote");
  assert.equal(remoteTurn.actorId, 20);
  assert.equal(remoteTurn.localCanAct, false);
  assert.equal(remoteTurn.lockHandStocks, true);

  const soloBotTurn = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
    stateSoloActorId: 20,
    currentSoloActorId: 20,
  });
  assert.deepEqual(soloBotTurn, {
    mode: "soloBot",
    actorId: 20,
    activeActorIds: [20],
    localCanAct: false,
    soloBotOwnsState: true,
    lockHandStocks: true,
    suppressFrameworkTurnBanner: true,
  });

  const reconnectedBotTurn = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
    currentSoloActorId: 30,
  });
  assert.equal(reconnectedBotTurn.mode, "soloBot");
  assert.equal(reconnectedBotTurn.actorId, 30);
  assert.equal(reconnectedBotTurn.localCanAct, false);

  const conflictingBotSignals = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
    stateSoloActorId: 20,
    currentSoloActorId: 30,
  });
  assert.deepEqual(conflictingBotSignals, {
    mode: "ambiguous",
    actorId: 20,
    activeActorIds: [20],
    localCanAct: false,
    soloBotOwnsState: false,
    lockHandStocks: true,
    suppressFrameworkTurnBanner: true,
  });

  const staleBotDuringHumanTurn = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
    stateSoloActorId: 0,
    currentSoloActorId: 20,
  });
  assert.equal(staleBotDuringHumanTurn.mode, "local");
  assert.equal(staleBotDuringHumanTurn.localCanAct, true);
  assert.equal(staleBotDuringHumanTurn.lockHandStocks, false);

  const legacySoloFallback = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
  });
  assert.equal(legacySoloFallback.mode, "local");
  assert.equal(legacySoloFallback.localCanAct, true);

  const localMultiActive = projectTurnInteraction({
    stateType: "multipleactiveplayer",
    localPlayerId: 10,
    frameworkActivePlayerIds: [10, 30],
    soloBotPlayerIds: [20, 30, 40],
    currentSoloActorId: 20,
  });
  assert.deepEqual(localMultiActive, {
    mode: "local",
    actorId: 0,
    activeActorIds: [10, 30],
    localCanAct: true,
    soloBotOwnsState: false,
    lockHandStocks: false,
    suppressFrameworkTurnBanner: false,
  });

  const remoteMultiActive = projectTurnInteraction({
    stateType: "multipleactiveplayer",
    localPlayerId: 10,
    frameworkActivePlayerIds: [20, 30],
    soloBotPlayerIds: [20, 30, 40],
    currentSoloActorId: 20,
  });
  assert.equal(remoteMultiActive.mode, "remote");
  assert.equal(remoteMultiActive.localCanAct, false);
  assert.equal(remoteMultiActive.lockHandStocks, true);

  const invalidSoloActor = projectTurnInteraction({
    stateType: "activeplayer",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
    stateSoloActorId: 99,
  });
  assert.equal(invalidSoloActor.mode, "ambiguous");
  assert.equal(invalidSoloActor.suppressFrameworkTurnBanner, true);

  const inactiveState = projectTurnInteraction({
    stateType: "game",
    localPlayerId: 10,
    frameworkActivePlayerId: 10,
    soloBotPlayerIds: [20, 30, 40],
    currentSoloActorId: 20,
  });
  assert.equal(inactiveState.mode, "inactive");
  assert.equal(inactiveState.localCanAct, false);
  assert.equal(inactiveState.suppressFrameworkTurnBanner, false);

  console.log("Turn interaction projection tests passed.");
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
