const assert = require("node:assert/strict");

const nodes = {};
globalThis.window = {};
globalThis._ = (text) => text;
globalThis.importDojoLibs = async () => [
  { byId: (id) => nodes[id] || null },
  (_name, _base, members) => {
    function DeclaredGame() {}
    DeclaredGame.prototype = members;
    return DeclaredGame;
  },
  class GameGui {}, class Counter {}, class Stock {},
];

(async () => {
  const { Game } = await import("../modules/js/Game.js");
  const game = new Game();
  const summary = {
    winner_id: 100356074,
    winner_name: "Shornilia",
    players: [{ player_id: 100356074, believer_count: 9, is_winner: 1 }],
  };
  const rendered = [];
  game.notif_gameEndSummaryShow = ({ args }) => {
    rendered.push(args);
    nodes.end_summary_winner_skill = {};
  };
  game.getTurnInteractionProjection = () => ({ localCanAct: true });
  game.statePresentation = { enter() {} };
  for (const name of [
    "schedulePracticeAiWatchdog", "cancelCenterActionVisualTransaction",
    "cancelDuelRoundVisualTransaction", "cancelAoeVisualTransaction",
    "cancelSkillCenterVisualTransaction", "cancelProphetVisualTransaction",
    "cancelDefenseBlockVisualTransaction", "cancelRedistributeVisualTransaction",
    "cancelRevivalVisualTransaction", "syncSoloBotTurnUi",
    "refreshHandCardReadinessVisuals",
  ]) game[name] = () => {};
  game.shouldHoldTransientArenaForConfrontation = () => false;

  game.onEnteringState("gameEndSummary", { args: { summary } });
  assert.deepEqual(rendered, [summary],
    "Rejoining state 102 must restore its winner summary without a new notification.");

  const staleCard = { id: 42, type: "secret_alliance" };
  let cardRenders = 0;
  game.rehydrateProphetArenaFromSnapshot = () => false;
  game.getActionCardsOnTableArray = () => [staleCard];
  game.getBelieversOnTableArray = () => [];
  game.showCenterActionCard = () => cardRenders++;
  const snapshot = {
    gamestate: { name: "gameEndSummary", args: { summary } },
    cardsontable: { 42: staleCard },
  };
  game.rehydrateCombatArenaFromSnapshot(snapshot);
  assert.equal(cardRenders, 0, "A stale Secret Alliance must never replace a terminal summary.");
  assert.equal(rendered.length, 1, "Repeated state entry must not restart the summary countdown.");

  delete nodes.end_summary_winner_skill;
  game.rehydrateCombatArenaFromSnapshot(snapshot);
  assert.deepEqual(rendered, [summary, summary], "Initial page setup must also restore state 102.");

  console.log("Game-end reconnect tests passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
