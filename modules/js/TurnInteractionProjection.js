function toPlayerId(value) {
  const id = Number.parseInt(value || 0, 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function uniquePlayerIds(values) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).map(toPlayerId).filter(Boolean))
  );
}

function ambiguousProjection() {
  return {
    mode: "ambiguous",
    actorId: 0,
    activeActorIds: [],
    localCanAct: false,
    soloBotOwnsState: false,
    lockHandStocks: true,
    suppressFrameworkTurnBanner: true,
  };
}

export function projectTurnInteraction(input = {}) {
  const stateType = String(input.stateType || "");
  const localPlayerId = toPlayerId(input.localPlayerId);
  const frameworkActorId = toPlayerId(input.frameworkActivePlayerId);
  const frameworkActivePlayerIds = uniquePlayerIds(
    input.frameworkActivePlayerIds
  );
  const soloBotIds = new Set(uniquePlayerIds(input.soloBotPlayerIds));

  if (stateType === "multipleactiveplayer") {
    const localCanAct = frameworkActivePlayerIds.includes(localPlayerId);
    return {
      mode: localCanAct ? "local" : "remote",
      actorId: 0,
      activeActorIds: frameworkActivePlayerIds,
      localCanAct,
      soloBotOwnsState: false,
      lockHandStocks: !localCanAct,
      suppressFrameworkTurnBanner: false,
    };
  }

  if (stateType !== "activeplayer") {
    return {
      mode: "inactive",
      actorId: 0,
      activeActorIds: [],
      localCanAct: false,
      soloBotOwnsState: false,
      lockHandStocks: true,
      suppressFrameworkTurnBanner: false,
    };
  }

  const hasStateSoloActor = Object.prototype.hasOwnProperty.call(
    input,
    "stateSoloActorId"
  );
  const stateSoloActorId = toPlayerId(input.stateSoloActorId);
  const currentSoloActorId = toPlayerId(input.currentSoloActorId);
  if (soloBotIds.size > 0 && hasStateSoloActor) {
    if (stateSoloActorId > 0 && !soloBotIds.has(stateSoloActorId)) {
      return ambiguousProjection();
    }
    if (
      stateSoloActorId > 0 &&
      currentSoloActorId > 0 &&
      stateSoloActorId !== currentSoloActorId
    ) {
      return ambiguousProjection();
    }
  }

  if (
    soloBotIds.size > 0 &&
    !hasStateSoloActor &&
    currentSoloActorId > 0 &&
    !soloBotIds.has(currentSoloActorId) &&
    currentSoloActorId !== frameworkActorId
  ) {
    return ambiguousProjection();
  }

  const soloActorId = hasStateSoloActor
    ? stateSoloActorId
    : soloBotIds.has(currentSoloActorId)
    ? currentSoloActorId
    : 0;
  if (soloActorId > 0) {
    return {
      mode: "soloBot",
      actorId: soloActorId,
      activeActorIds: [soloActorId],
      localCanAct: false,
      soloBotOwnsState: true,
      lockHandStocks: true,
      suppressFrameworkTurnBanner: true,
    };
  }

  const localCanAct = frameworkActorId > 0 && frameworkActorId === localPlayerId;
  return {
    mode: localCanAct ? "local" : "remote",
    actorId: frameworkActorId,
    activeActorIds: frameworkActorId > 0 ? [frameworkActorId] : [],
    localCanAct,
    soloBotOwnsState: false,
    lockHandStocks: !localCanAct,
    suppressFrameworkTurnBanner: false,
  };
}
