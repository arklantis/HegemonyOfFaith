"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async function () {
  const moduleUrl = pathToFileURL(
    path.join(__dirname, "..", "modules", "js", "AiStepPacing.js")
  ).href;
  const { createAiStepPacing } = await import(moduleUrl);
  let now = 1000;
  let nextTimerId = 1;
  let visualBusyUntil = 0;
  const timers = new Map();
  const setTimer = function (callback, delay) {
    const id = nextTimerId++;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  const clearTimer = (id) => timers.delete(id);
  const waitForVisuals = function (effect) {
    let timer = null;
    const settle = function () {
      const remaining = Math.max(0, visualBusyUntil - now);
      timer = setTimer(remaining > 0 ? settle : effect, remaining);
    };
    settle();
    return () => clearTimer(timer);
  };
  const advance = function (duration) {
    const target = now + duration;
    while (true) {
      const due = Array.from(timers.entries())
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at;
      timers.delete(due[0]);
      due[1].callback();
    }
    now = target;
  };
  const livePacing = createAiStepPacing({
    now: () => now,
    setTimer,
    clearTimer,
    waitForVisuals,
  });

  const events = [];
  visualBusyUntil = now + 1200;
  livePacing.schedule({ actorId: 2, delayMs: 900 }, () => events.push("normal"));
  advance(1199);
  assert.deepEqual(events, []);
  advance(1);
  assert.deepEqual(
    events,
    ["normal"],
    "A normal AI step must not land while a visual transaction is busy."
  );

  livePacing.markSkillVisual(2);
  visualBusyUntil = now + 500;
  livePacing.schedule({ actorId: 2, delayMs: 900 }, () => events.push("skill"));
  advance(500);
  assert.deepEqual(events, ["normal"]);
  advance(899);
  assert.deepEqual(events, ["normal"]);
  advance(1);
  assert.deepEqual(
    events,
    ["normal", "skill"],
    "A step after a Skill must apply its delay after visuals settle."
  );

  livePacing.schedule({ actorId: 2, delayMs: 500 }, () => events.push("stale"));
  livePacing.schedule({ actorId: 3, delayMs: 100 }, () => events.push("latest"));
  advance(100);
  assert.deepEqual(
    events,
    ["normal", "skill", "latest"],
    "A newer pacing request must cancel the older request."
  );

  let blocked = true;
  livePacing.schedule(
    {
      actorId: 3,
      delayMs: 0,
      getRetryDelayMs: () => (blocked ? 200 : 0),
    },
    () => events.push("unblocked")
  );
  advance(400);
  assert.deepEqual(events, ["normal", "skill", "latest"]);
  blocked = false;
  advance(200);
  assert.deepEqual(events, ["normal", "skill", "latest", "unblocked"]);

  console.log("AI step pacing tests passed.");
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
