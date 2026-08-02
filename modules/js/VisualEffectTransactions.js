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
  const settleWaiters = new Set();
  let nextId = 1;

  function remainingAll() {
    let delay = 0;
    channels.forEach(function (record) {
      delay = Math.max(delay, Math.max(0, record.busyUntil - now()));
    });
    return delay;
  }

  function cancelWaiter(waiter) {
    if (!waiter || !settleWaiters.has(waiter)) return false;
    if (waiter.timer !== null) clearTimer(waiter.timer);
    waiter.timer = null;
    settleWaiters.delete(waiter);
    return true;
  }

  function scheduleWaiter(waiter) {
    if (!waiter || !settleWaiters.has(waiter)) return;
    if (waiter.timer !== null) clearTimer(waiter.timer);
    waiter.timer = setTimer(function () {
      waiter.timer = null;
      if (!settleWaiters.has(waiter)) return;
      const busyMs = remainingAll();
      if (busyMs > 0) {
        scheduleWaiter(waiter);
        return;
      }
      settleWaiters.delete(waiter);
      waiter.effect();
    }, remainingAll() + waiter.paddingMs);
  }

  function notifyTimelineChanged() {
    settleWaiters.forEach(scheduleWaiter);
  }

  function createRecord(key) {
    const record = {
      id: nextId++,
      timers: new Set(),
      busyUntil: 0,
    };
    channels.set(key, record);
    return record;
  }

  function cancel(channel) {
    const key = String(channel || "");
    const active = channels.get(key);
    if (!active) return false;
    active.timers.forEach(clearTimer);
    active.timers.clear();
    channels.delete(key);
    notifyTimelineChanged();
    return true;
  }

  function begin(channel) {
    const key = String(channel || "");
    if (!key) throw new Error("Visual effect transaction requires a channel.");
    cancel(key);

    const record = createRecord(key);
    notifyTimelineChanged();

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
        notifyTimelineChanged();
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
      cancelScheduled: function (timer) {
        if (!isCurrent() || !record.timers.has(timer)) return false;
        clearTimer(timer);
        record.timers.delete(timer);
        return true;
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
    hold: function (channel, durationMs) {
      const key = String(channel || "");
      if (!key) throw new Error("Visual effect hold requires a channel.");
      const record = channels.get(key) || createRecord(key);
      record.busyUntil = Math.max(
        record.busyUntil,
        now() + normalizeDelay(durationMs)
      );
      notifyTimelineChanged();
      return Math.max(0, record.busyUntil - now());
    },
    isActive: function (channel) {
      return channels.has(String(channel || ""));
    },
    remaining: function (channel) {
      const active = channels.get(String(channel || ""));
      return active ? Math.max(0, active.busyUntil - now()) : 0;
    },
    remainingAll,
    whenSettled: function (effect, waitOptions = {}) {
      if (typeof effect !== "function") return function () {};
      const waiter = {
        effect,
        paddingMs: normalizeDelay(waitOptions.paddingMs),
        timer: null,
      };
      settleWaiters.add(waiter);
      scheduleWaiter(waiter);
      return function () {
        cancelWaiter(waiter);
      };
    },
    cancelAll: function () {
      Array.from(channels.keys()).forEach(cancel);
    },
  };
}
