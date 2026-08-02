"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function loadModule() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "modules", "js", "VisualEffectTransactions.js"),
    "utf8"
  );
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}

async function main() {
  const { createVisualEffectTransactions } = await loadModule();
  let now = 1000;
  let nextTimerId = 1;
  const timers = new Map();
  const transactions = createVisualEffectTransactions({
    now: () => now,
    setTimer: (callback, delay) => {
      const id = nextTimerId++;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (duration) => {
    now += duration;
    Array.from(timers.entries())
      .filter(([, timer]) => timer.at <= now)
      .sort((a, b) => a[1].at - b[1].at)
      .forEach(([id, timer]) => {
        timers.delete(id);
        timer.callback();
      });
  };

  const events = [];
  const first = transactions.begin("prophet");
  first.hold(500);
  first.schedule(300, () => events.push("stale"));
  assert.equal(transactions.remaining("prophet"), 500);

  const second = transactions.begin("prophet");
  second.hold(800);
  second.schedule(200, () => events.push("current"));
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  assert.equal(timers.size, 1, "Replacing a transaction must clear old timers.");

  advance(200);
  assert.deepEqual(events, ["current"]);
  assert.equal(transactions.remaining("prophet"), 600);

  second.finish();
  assert.equal(transactions.isActive("prophet"), false);
  assert.equal(transactions.remaining("prophet"), 0);

  const combat = transactions.begin("combat");
  combat.schedule(10, () => events.push("cancelled"));
  transactions.cancelAll();
  advance(20);
  assert.deepEqual(events, ["current"]);

  const firstDuelRound = transactions.begin("duelRound");
  firstDuelRound.schedule(100, () => events.push("round-1-setup"));
  firstDuelRound.schedule(500, () => events.push("round-1-cleanup"));
  const secondDuelRound = transactions.begin("duelRound");
  const replacedRoundTwoTimer = secondDuelRound.schedule(25, () =>
    events.push("replaced-round-2-cleanup")
  );
  assert.equal(secondDuelRound.cancelScheduled(replacedRoundTwoTimer), true);
  secondDuelRound.schedule(50, () => events.push("round-2-setup"));
  assert.equal(
    timers.size,
    1,
    "Starting a duel round must cancel every timer owned by the previous round."
  );
  advance(500);
  assert.deepEqual(events, ["current", "round-2-setup"]);

  console.log("Visual-effect transaction tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
