const ACTIVE_ONLY_STATES = new Set([
  "playerTurn",
  "chooseSurrenderOrWanderer",
  "askLeaderSupport",
  "surrenderLeaderResponse",
  "discardingActionCard",
  "leaderGiveBeliever",
  "chooseWarRepresentative",
  "martyrdomChooseRepresentative",
  "chooseFaithDebateRepresentative",
  "conspiracyChooseRepresentative",
  "faithWarDuel",
  "prophetSkillPrompt",
  "prophetGuess",
  "infoSpyReview",
  "holyRebirthPrompt",
  "faithDebateStopLeaderApproval",
  "reverseKarmaPrompt",
]);

const REACTIVE_STATES = new Set([
  "confirmDefense",
  "martyrdomChooseBelievers",
  "conspiracyChooseBelievers",
]);

const SECRET_ALLIANCE_STATES = new Set([
  "secretAllianceAttackerChoice",
  "secretAllianceTargetChoice",
]);

const PRESENTERS = new Set([
  "chooseInitialSkill",
  ...ACTIVE_ONLY_STATES,
  ...REACTIVE_STATES,
  ...SECRET_ALLIANCE_STATES,
  "faithDebateDuel",
  "gameEndSummary",
]);

export function projectStatePresentation(input = {}) {
  const stateName = String(input.stateName || "");
  const args = input.args && typeof input.args === "object" ? input.args : {};
  const interaction = input.interaction || {};
  const playerId = parseInt(input.playerId || 0, 10) || 0;
  const localCanAct = !!interaction.localCanAct;
  const blocked =
    interaction.mode === "soloBot" || interaction.mode === "ambiguous";
  const activePlayerId =
    parseInt(args.active_player_id || input.activePlayerId || 0, 10) || 0;
  const initialSkillCanRender =
    stateName === "chooseInitialSkill" &&
    (localCanAct || activePlayerId === playerId);
  const secretActorId = SECRET_ALLIANCE_STATES.has(stateName)
    ? parseInt(args.actor_id || 0, 10) || 0
    : 0;
  const secretActorMatches = secretActorId <= 0 || secretActorId === playerId;

  let renderControls = false;
  if (!blocked) {
    if (initialSkillCanRender || REACTIVE_STATES.has(stateName)) {
      renderControls = true;
    } else if (ACTIVE_ONLY_STATES.has(stateName)) {
      renderControls = localCanAct;
    } else if (SECRET_ALLIANCE_STATES.has(stateName)) {
      renderControls = localCanAct && secretActorMatches;
    } else if (stateName === "faithDebateDuel") {
      renderControls = localCanAct || !!input.canRequestFaithDebateStop;
    }
  }

  return {
    stateName,
    presenter: PRESENTERS.has(stateName) ? stateName : "",
    renderControls,
    presentState:
      PRESENTERS.has(stateName) &&
      (renderControls || stateName === "chooseInitialSkill"),
    initialSkillCanRender,
    localCanAct,
    lockHandStocks: !!interaction.lockHandStocks,
    suppressFrameworkTurnBanner: !!interaction.suppressFrameworkTurnBanner,
    soloBotOwnsState: !!interaction.soloBotOwnsState,
    clearInitialSkillDraft: stateName !== "chooseInitialSkill",
    cancelPendingSelections: stateName !== "playerTurn",
    clearGameEndSummaryTimers: stateName !== "gameEndSummary",
    clearTargetSelection:
      stateName !== "playerTurn" && stateName !== "chooseSurrenderOrWanderer",
    clearZombieSelection: stateName !== "faithWarDuel",
    resetDuelCommit:
      stateName === "faithWarDuel" || stateName === "faithDebateDuel",
    resetReverseKarma: stateName === "reverseKarmaPrompt",
    cancelPracticeAi:
      stateName === "gameEndSummary" || stateName === "gameEnd",
  };
}

export function createStatePresentation(options = {}) {
  const adapter = options.adapter || {};

  return {
    project(input) {
      return projectStatePresentation(input);
    },

    enter(input) {
      const presentation = projectStatePresentation(input);
      if (presentation.cancelPracticeAi && adapter.cancelPracticeAi) adapter.cancelPracticeAi();
      if (presentation.clearInitialSkillDraft && adapter.clearInitialSkillDraft) adapter.clearInitialSkillDraft();
      if (presentation.cancelPendingSelections && adapter.cancelPendingSelections) adapter.cancelPendingSelections();
      if (presentation.clearGameEndSummaryTimers && adapter.clearGameEndSummaryTimers) adapter.clearGameEndSummaryTimers();
      if (presentation.clearTargetSelection && adapter.clearTargetSelection) adapter.clearTargetSelection();
      if (presentation.clearZombieSelection && adapter.clearZombieSelection) adapter.clearZombieSelection();
      if (presentation.resetDuelCommit && adapter.resetDuelCommit) adapter.resetDuelCommit();
      if (presentation.resetReverseKarma && adapter.resetReverseKarma) adapter.resetReverseKarma();
      return presentation;
    },

    present(input) {
      const presentation =
        input.presentation || projectStatePresentation(input);
      if (adapter.prepare) adapter.prepare(presentation, input.args || {});
      if (presentation.presentState && presentation.presenter) {
        if (adapter.present) {
          adapter.present(
            presentation.presenter,
            input.args || {},
            presentation,
            input.context || {}
          );
        }
      }
      if (adapter.finish) adapter.finish(presentation, input.args || {});
      return presentation;
    },
  };
}
