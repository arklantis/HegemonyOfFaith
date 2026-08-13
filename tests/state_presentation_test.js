import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStatePresentation,
  projectStatePresentation,
} from "../modules/js/StatePresentation.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const gameSource = fs.readFileSync(
  path.join(testDir, "..", "modules", "js", "Game.js"),
  "utf8"
);
const presenterMap = gameSource.match(
  /const presenters = \{([\s\S]*?)\n\s*\};/
);
assert.ok(presenterMap, "The state presenter adapter map must remain identifiable.");
const presenterMethods = Array.from(
  presenterMap[1].matchAll(/:\s*"(present[A-Za-z0-9]+State)"/g),
  (match) => match[1]
);
assert.equal(presenterMethods.length, 25, "Every projected state must have one presenter adapter.");
assert.equal(new Set(presenterMethods).size, presenterMethods.length, "Presenter adapters must be unique.");
for (const method of presenterMethods) {
  assert.match(
    gameSource,
    new RegExp("\\n\\s*" + method + ":\\s*function\\s*\\("),
    `${method} must reference an existing game method.`
  );
}

const active = { localCanAct: true, mode: "local", lockHandStocks: false };
const waiting = { localCanAct: false, mode: "waiting", lockHandStocks: true };

assert.equal(
  projectStatePresentation({ stateName: "playerTurn", interaction: active }).renderControls,
  true,
  "The local turn must render its presenter."
);
assert.equal(
  projectStatePresentation({ stateName: "playerTurn", interaction: waiting }).renderControls,
  false,
  "Another player's turn must not render local controls."
);
assert.equal(
  projectStatePresentation({
    stateName: "confirmDefense",
    interaction: waiting,
  }).renderControls,
  true,
  "Reactive defense presentation remains available to its state-specific guard."
);
assert.equal(
  projectStatePresentation({
    stateName: "secretAllianceTargetChoice",
    args: { actor_id: 8 },
    playerId: 7,
    interaction: active,
  }).renderControls,
  false,
  "Private Secret Alliance controls must only render for their actor."
);
assert.equal(
  projectStatePresentation({
    stateName: "faithDebateDuel",
    interaction: waiting,
    canRequestFaithDebateStop: true,
  }).renderControls,
  true,
  "A Leader may receive the debate-stop presenter without being the representative."
);
assert.equal(
  projectStatePresentation({ stateName: "unknown", interaction: active }).presenter,
  "",
  "Unknown states must not gain accidental controls."
);
assert.equal(
  projectStatePresentation({
    stateName: "chooseInitialSkill",
    interaction: waiting,
  }).presentState,
  true,
  "Initial Skill presentation must render its waiting state for non-actors."
);

const calls = [];
const presentation = createStatePresentation({
  adapter: {
    cancelPendingSelections: () => calls.push("cancelSelections"),
    clearTargetSelection: () => calls.push("clearTargets"),
    clearZombieSelection: () => calls.push("clearZombie"),
    resetDuelCommit: () => calls.push("resetDuel"),
    prepare: ({ stateName }) => calls.push(`prepare:${stateName}`),
    present: (presenter, args, projected, context) =>
      calls.push(`present:${presenter}:${context.marker || ""}`),
    finish: ({ stateName }) => calls.push(`finish:${stateName}`),
  },
});
presentation.enter({ stateName: "faithDebateDuel", interaction: active });
presentation.present({
  stateName: "faithDebateDuel",
  interaction: active,
  context: { marker: "context" },
});
assert.deepEqual(calls, [
  "cancelSelections",
  "clearTargets",
  "clearZombie",
  "resetDuel",
  "prepare:faithDebateDuel",
  "present:faithDebateDuel:context",
  "finish:faithDebateDuel",
]);

console.log("State presentation tests passed.");
