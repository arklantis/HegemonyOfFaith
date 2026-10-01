"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const nodesById = {};

globalThis.window = { innerWidth: 390 };
globalThis.document = {
  documentElement: { clientWidth: 390 },
};
globalThis.getComputedStyle = () => ({
  getPropertyValue(name) {
    if (name === "--tier-l-w") return "126px";
    if (name === "--tier-m-w") return "90px";
    return "";
  },
});
globalThis._ = (text) => text;
globalThis.importDojoLibs = async () => [
  {
    byId(value) {
      return typeof value === "string" ? nodesById[value] || { id: value } : value;
    },
    position(node) {
      return {
        x: Number((node && node.x) || 0),
        y: Number((node && node.y) || 0),
        w: Number((node && node.w) || 0),
        h: Number((node && node.h) || 0),
      };
    },
  },
  (_name, _base, members) => {
    function DeclaredGame() {}
    DeclaredGame.prototype = members;
    return DeclaredGame;
  },
  class GameGui {},
  class Counter {},
  class Stock {},
];

(async () => {
  const { Game } = await import("../modules/js/Game.js");
  const game = new Game();

  assert.equal(
    game.getFlightTierWidthForNode({ id: "central_arena" }),
    70,
    "At 390px, a flight to the center must use the rendered mobile card width."
  );
  assert.equal(
    game.getFlightTierWidthForNode({ id: "graveyard" }),
    70,
    "At 390px, a flight to a common pile must use the rendered mobile pile width."
  );
  assert.equal(
    game.getFlightTierWidthForNode({
      id: "table_action_icon_12",
      className: "card-back-action table-mini-card",
      w: 20,
      h: 28,
    }),
    20,
    "A flight starting at a compact player card must use that rendered card width."
  );

  assert.deepEqual(
    game.getStagedRevealRowPlacement({
      anchorLeft: 280,
      anchorTop: 100,
      anchorWidth: 70,
      anchorHeight: 97,
      rowWidth: 124,
      containerWidth: 356,
      gap: 10,
      edgeInset: 8,
    }),
    { left: 224, top: 207, below: true },
    "A three-card revival row must move below its anchor before crossing the mobile right edge."
  );

  assert.deepEqual(
    game.getStagedRevealRowPlacement({
      anchorLeft: 100,
      anchorTop: 50,
      anchorWidth: 126,
      anchorHeight: 175,
      rowWidth: 222,
      containerWidth: 1000,
      gap: 10,
      edgeInset: 8,
    }),
    { left: 236, top: 50, below: false },
    "A revival row with enough space must remain beside its anchor."
  );

  nodesById.game_play_area = {
    id: "game_play_area",
    x: 200,
    y: 200,
    w: 356,
    h: 900,
  };
  nodesById.current_center_action_card = {
    id: "current_center_action_card",
    x: 333,
    y: 300,
    w: 90,
    h: 110,
  };
  nodesById.center_action_card_face = {
    id: "center_action_card_face",
    x: 343,
    y: 300,
    w: 70,
    h: 97,
  };
  assert.deepEqual(
    game.getProphetParkBasePosition(),
    { left: 63, top: 100, cardW: 70, cardH: 97 },
    "The Prophet must park one mobile-card width left of the centered recruit card."
  );

  const css = fs.readFileSync(
    path.join(__dirname, "..", "hegemonyoffaith.css"),
    "utf8"
  );
  const gameSource = fs.readFileSync(
    path.join(__dirname, "..", "modules", "js", "Game.js"),
    "utf8"
  );
  assert.match(
    gameSource,
    /innerHTML:\s*this\.escapeHtml\(_\("No Believer available\."\)\)/,
    "The narrow mobile AoE placeholder must use a short readable message."
  );
  assert.doesNotMatch(
    gameSource,
    /currently has no Believers available for this confrontation/,
    "The verbose AoE placeholder must not return."
  );
  assert.match(
    css,
    /#central_arena\.prophet-prediction-active\s*\{[\s\S]{0,500}display:\s*grid;[\s\S]{0,500}grid-template-columns:\s*var\(--prophet-side-slot-w\)\s+var\(--combat-card-w\)\s+var\(--prophet-side-slot-w\)/,
    "The Prophet table must reserve explicit left, center and right columns."
  );
  assert.match(
    css,
    /#central_arena\.prophet-prediction-active\s*>\s*\.center-action-wrap\s*\{[\s\S]{0,180}grid-column:\s*2/,
    "The recruit card must stay in the Prophet row's center column."
  );
  assert.match(
    css,
    /#central_arena\.prophet-prediction-active\s*>\s*\.prophet-prediction-host\s*\{[\s\S]{0,180}grid-column:\s*3/,
    "The predicted Believer must stay in the Prophet row's right column."
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.aoe-combat-layout\s*\{[\s\S]{0,160}--aoe-result-row-h:\s*14px;[\s\S]{0,160}gap:\s*4px;/,
    "Mobile AoE must use a compact result reserve and attacker-to-VS gap."
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.aoe-right-lane\s*\{[\s\S]{0,160}gap:\s*6px 8px;/,
    "Wrapped mobile AoE defender rows must remain compact."
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.aoe-action-card-slot,[\s\S]{0,100}\.aoe-commit-item:not\(\.aoe-no-believer-placeholder\)\s*\{[\s\S]{0,120}padding-bottom:\s*calc\(var\(--aoe-result-row-h\) \+ 2px\);/,
    "Mobile AoE must keep a small stable result row without desktop padding."
  );

  console.log("Responsive visual contract tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
