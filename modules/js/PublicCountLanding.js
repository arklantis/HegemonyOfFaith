function normalizeDelay(value) {
  const delay = Number.parseInt(value || 0, 10);
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

export function createPublicCountDomAdapter(options = {}) {
  const getNode = typeof options.getNode === "function" ? options.getNode : () => null;
  const getPlayer =
    typeof options.getPlayer === "function" ? options.getPlayer : () => null;
  const setSkillProtection =
    typeof options.setSkillProtection === "function"
      ? options.setSkillProtection
      : () => {};
  const setGraveyard =
    typeof options.setGraveyard === "function" ? options.setGraveyard : () => {};
  const onApplied =
    typeof options.onApplied === "function" ? options.onApplied : () => {};

  function setNodeCount(nodeId, value) {
    const node = getNode(nodeId);
    if (node) node.innerHTML = String(normalizeDelay(value));
  }

  return {
    apply: function (payload = {}) {
      const actionCounts = payload.action_counts || {};
      const believerCounts = payload.believer_counts || {};
      if (typeof payload.skill_protection !== "undefined") {
        setSkillProtection(payload.skill_protection || {});
      }
      Object.keys(actionCounts).forEach(function (playerId) {
        const count = normalizeDelay(actionCounts[playerId]);
        const player = getPlayer(playerId);
        if (player) player.action_count = count;
        setNodeCount("table_action_count_" + playerId, count);
      });
      Object.keys(believerCounts).forEach(function (playerId) {
        const count = normalizeDelay(believerCounts[playerId]);
        const player = getPlayer(playerId);
        if (player) player.believer_count = count;
        setNodeCount("table_believer_count_" + playerId, count);
      });
      if (typeof payload.action_deck_count !== "undefined") {
        setNodeCount("action_deck_count", payload.action_deck_count);
      }
      if (typeof payload.believer_deck_count !== "undefined") {
        setNodeCount("believer_deck_count", payload.believer_deck_count);
      }
      setGraveyard(payload);
      onApplied(payload);
    },
  };
}

export function createPublicCountLanding(options = {}) {
  const setTimer =
    typeof options.setTimer === "function" ? options.setTimer : setTimeout;
  const clearTimer =
    typeof options.clearTimer === "function" ? options.clearTimer : clearTimeout;
  const getBusyMs =
    typeof options.getBusyMs === "function" ? options.getBusyMs : () => 0;
  const apply = typeof options.apply === "function" ? options.apply : () => {};
  const settlePaddingMs = normalizeDelay(options.settlePaddingMs);
  let timer = null;
  let revision = 0;
  let pendingPayload = null;

  function cancelTimer() {
    if (timer !== null) clearTimer(timer);
    timer = null;
  }

  function schedule(expectedRevision, delayMs) {
    cancelTimer();
    timer = setTimer(function () {
      timer = null;
      if (expectedRevision !== revision || pendingPayload === null) return;
      const busyMs = normalizeDelay(getBusyMs());
      if (busyMs > 0) {
        schedule(expectedRevision, busyMs + settlePaddingMs);
        return;
      }
      const payload = pendingPayload;
      pendingPayload = null;
      apply(payload);
    }, normalizeDelay(delayMs));
  }

  return {
    receive: function (payload, initialDelayMs = 0) {
      revision += 1;
      pendingPayload = payload || {};
      const busyMs = Math.max(
        normalizeDelay(initialDelayMs),
        normalizeDelay(getBusyMs())
      );
      if (busyMs > 0) {
        schedule(revision, busyMs + settlePaddingMs);
        return revision;
      }
      cancelTimer();
      const latest = pendingPayload;
      pendingPayload = null;
      apply(latest);
      return revision;
    },
    cancel: function () {
      revision += 1;
      pendingPayload = null;
      cancelTimer();
    },
    hasPending: function () {
      return pendingPayload !== null;
    },
  };
}
