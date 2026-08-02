const CONFRONTATION_VISUAL_STATES = new Set([
  "resolveDuel",
  "resolveFaithDebateDuel",
  "reverseKarmaPrompt",
  "faithWarDuel",
  "faithDebateDuel",
]);
const BELIEVER_SACRIFICE_SKILLS = new Set([2, 7, 8, 13]);

export function projectBelieverCardReadiness(input = {}) {
  const stateName = String(input.stateName || "");
  if (CONFRONTATION_VISUAL_STATES.has(stateName)) {
    return { ready: true, reason: "confrontation_visual" };
  }
  if (stateName === "leaderGiveBeliever") {
    const ready = !!input.localCanAct && !!input.canGiveBeliever;
    return { ready, reason: ready ? "give_believer" : "waiting" };
  }
  if (
    stateName === "martyrdomChooseBelievers" ||
    stateName === "conspiracyChooseBelievers"
  ) {
    const ready = !!input.canCommitAoeBeliever;
    return { ready, reason: ready ? "aoe_commit" : "waiting" };
  }
  if (
    stateName === "playerTurn" &&
    input.hasPendingSkill &&
    !input.actionSubmissionInFlight &&
    BELIEVER_SACRIFICE_SKILLS.has(
      Number.parseInt(input.pendingSkillType || 0, 10)
    )
  ) {
    return { ready: true, reason: "skill_sacrifice" };
  }
  return { ready: false, reason: "waiting" };
}
