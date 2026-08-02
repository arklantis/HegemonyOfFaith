export function projectSkillCardReadiness(input = {}) {
  if (String(input.stateName || "") !== "playerTurn") {
    return { selectable: false, selectionMode: 0, reason: "inactive_state" };
  }
  if (!input.localCanAct) {
    return { selectable: false, selectionMode: 0, reason: "remote_turn" };
  }
  if (input.actionSubmissionInFlight) {
    return { selectable: false, selectionMode: 0, reason: "submitting" };
  }
  if (input.discardMode) {
    return { selectable: false, selectionMode: 0, reason: "discard_mode" };
  }

  const available =
    !!input.useSkillActionAvailable ||
    (!!input.praiseLifeDecisionPending && !!input.skillCanUse);
  return available
    ? { selectable: true, selectionMode: 1, reason: "available" }
    : { selectable: false, selectionMode: 0, reason: "unavailable" };
}
