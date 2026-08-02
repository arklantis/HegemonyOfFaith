"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function loadModule() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "modules", "js", "PublicCountLanding.js"),
    "utf8"
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}

(async function () {
  const { createPublicCountDomAdapter, createPublicCountLanding } =
    await loadModule();
  let now = 1000;
  let busyUntil = 1600;
  let nextTimerId = 1;
  const timers = new Map();
  const nodes = {
    table_believer_count_1: { innerHTML: "4" },
    action_deck_count: { innerHTML: "20" },
  };
  const players = { 1: { believer_count: 4 } };
  const appliedGraveyards = [];
  const adapter = createPublicCountDomAdapter({
    getNode: (id) => nodes[id] || null,
    getPlayer: (id) => players[id] || null,
    setGraveyard: (payload) => appliedGraveyards.push(payload.graveyard_count),
  });
  const landing = createPublicCountLanding({
    getBusyMs: () => Math.max(0, busyUntil - now),
    settlePaddingMs: 50,
    apply: (payload) => adapter.apply(payload),
    setTimer: (callback, delay) => {
      const id = nextTimerId++;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (duration) => {
    now += duration;
    let due;
    do {
      due = Array.from(timers.entries())
        .filter(([, timer]) => timer.at <= now)
        .sort((a, b) => a[1].at - b[1].at);
      due.forEach(([id, timer]) => {
        timers.delete(id);
        timer.callback();
      });
    } while (due.length > 0);
  };

  landing.receive({ believer_counts: { 1: 3 }, graveyard_count: 1 });
  landing.receive({
    believer_counts: { 1: 5 },
    action_deck_count: 18,
    graveyard_count: 2,
  });
  assert.equal(nodes.table_believer_count_1.innerHTML, "4");
  assert.equal(players[1].believer_count, 4);

  advance(649);
  assert.equal(nodes.table_believer_count_1.innerHTML, "4");
  advance(1);
  assert.equal(nodes.table_believer_count_1.innerHTML, "5");
  assert.equal(players[1].believer_count, 5);
  assert.equal(nodes.action_deck_count.innerHTML, "18");
  assert.deepEqual(appliedGraveyards, [2]);
  assert.equal(landing.hasPending(), false);

  landing.receive({ believer_counts: { 1: 6 } });
  assert.equal(nodes.table_believer_count_1.innerHTML, "6");

  console.log("Public count landing tests passed.");
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});
