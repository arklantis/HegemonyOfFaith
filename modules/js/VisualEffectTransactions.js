function normalizeDelay(value) {
  const delay = Number.parseInt(value || 0, 10);
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

export function createVisualEffectTransactions(options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const setTimer =
    typeof options.setTimer === "function" ? options.setTimer : setTimeout;
  const clearTimer =
    typeof options.clearTimer === "function" ? options.clearTimer : clearTimeout;
  const channels = new Map();
  let nextId = 1;

  function cancel(channel) {
    const key = String(channel || "");
    const active = channels.get(key);
    if (!active) return false;
    active.timers.forEach(clearTimer);
    active.timers.clear();
    channels.delete(key);
    return true;
  }

  function begin(channel) {
    const key = String(channel || "");
    if (!key) throw new Error("Visual effect transaction requires a channel.");
    cancel(key);

    const record = {
      id: nextId++,
      timers: new Set(),
      busyUntil: 0,
    };
    channels.set(key, record);

    const isCurrent = function () {
      return channels.get(key) === record;
    };

    return {
      channel: key,
      id: record.id,
      isCurrent,
      hold: function (durationMs) {
        if (!isCurrent()) return 0;
        record.busyUntil = Math.max(
          record.busyUntil,
          now() + normalizeDelay(durationMs)
        );
        return Math.max(0, record.busyUntil - now());
      },
      schedule: function (delayMs, effect) {
        if (!isCurrent() || typeof effect !== "function") return null;
        const timer = setTimer(function () {
          record.timers.delete(timer);
          if (isCurrent()) effect();
        }, normalizeDelay(delayMs));
        record.timers.add(timer);
        return timer;
      },
      finish: function () {
        if (!isCurrent()) return false;
        return cancel(key);
      },
      cancel: function () {
        if (!isCurrent()) return false;
        return cancel(key);
      },
    };
  }

  return {
    begin,
    cancel,
    isActive: function (channel) {
      return channels.has(String(channel || ""));
    },
    remaining: function (channel) {
      const active = channels.get(String(channel || ""));
      return active ? Math.max(0, active.busyUntil - now()) : 0;
    },
    cancelAll: function () {
      Array.from(channels.keys()).forEach(cancel);
    },
  };
}
