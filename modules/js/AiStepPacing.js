function normalizeDelay(value) {
  const delay = Number.parseInt(value || 0, 10);
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

export function createAiStepPacing(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const setTimer =
    typeof options.setTimer === "function" ? options.setTimer : setTimeout;
  const clearTimer =
    typeof options.clearTimer === "function" ? options.clearTimer : clearTimeout;
  const waitForVisuals =
    typeof options.waitForVisuals === "function"
      ? options.waitForVisuals
      : function (effect) {
          const timer = setTimer(effect, 0);
          return function () {
            clearTimer(timer);
          };
        };
  const skillMarkerMaxAgeMs = normalizeDelay(options.skillMarkerMaxAgeMs || 15000);
  const pendingSkillActors = new Map();
  let revision = 0;
  let timer = null;
  let cancelVisualWait = null;

  function actorKey(actorId) {
    const id = Number.parseInt(actorId || 0, 10);
    return id > 0 ? String(id) : "";
  }

  function cancelPending() {
    revision += 1;
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (cancelVisualWait) cancelVisualWait();
    cancelVisualWait = null;
  }

  function consumeRecentSkillMarker(actorId) {
    const key = actorKey(actorId);
    const markedAt = key ? pendingSkillActors.get(key) : undefined;
    if (key) pendingSkillActors.delete(key);
    return (
      typeof markedAt === "number" && now() - markedAt <= skillMarkerMaxAgeMs
    );
  }

  return {
    markSkillVisual: function (actorId) {
      const key = actorKey(actorId);
      if (key) pendingSkillActors.set(key, now());
    },
    schedule: function (request = {}, effect) {
      cancelPending();
      const requestRevision = revision;
      const delayMs = normalizeDelay(request.delayMs);
      const followsRecentSkill = consumeRecentSkillMarker(request.actorId);
      const isCurrent =
        typeof request.isCurrent === "function" ? request.isCurrent : () => true;
      const getRetryDelayMs =
        typeof request.getRetryDelayMs === "function"
          ? request.getRetryDelayMs
          : () => 0;
      const onWaiting =
        typeof request.onWaiting === "function" ? request.onWaiting : () => {};
      let postVisualDelayPending = followsRecentSkill;

      const current = function () {
        return requestRevision === revision && isCurrent();
      };
      const scheduleTimer = function (callback, delay) {
        if (!current()) return;
        if (timer !== null) clearTimer(timer);
        timer = setTimer(function () {
          timer = null;
          if (current()) callback();
        }, normalizeDelay(delay));
      };
      const waitUntilVisualsSettle = function () {
        if (!current()) return;
        if (cancelVisualWait) cancelVisualWait();
        cancelVisualWait = waitForVisuals(function () {
          cancelVisualWait = null;
          if (!current()) return;
          if (postVisualDelayPending) {
            postVisualDelayPending = false;
            scheduleTimer(waitUntilVisualsSettle, delayMs);
            return;
          }
          const retryDelayMs = normalizeDelay(getRetryDelayMs());
          if (retryDelayMs > 0) {
            onWaiting();
            scheduleTimer(waitUntilVisualsSettle, retryDelayMs);
            return;
          }
          revision += 1;
          if (typeof effect === "function") effect();
        });
      };

      if (followsRecentSkill) {
        waitUntilVisualsSettle();
      } else {
        scheduleTimer(waitUntilVisualsSettle, delayMs);
      }
      return requestRevision;
    },
    cancel: function () {
      cancelPending();
    },
    clear: function () {
      cancelPending();
      pendingSkillActors.clear();
    },
  };
}
