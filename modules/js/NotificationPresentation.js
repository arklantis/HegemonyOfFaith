const HANDLER_NOTIFICATIONS = [
  "actionCardPlayed", "newActionCards", "drawActionCards", "reshuffleActionDiscard",
  "haveACharity", "divineInspiration", "greatMercy", "infoSpy", "infoSpyFinished",
  "newBelievers", "spyResult", "believerStolen", "believersDiscarded",
  "breakingFaithStart", "spreadRumorsStart", "spreadRumors", "spreadRumorsSummary",
  "secretAllianceExchanged", "secretAllianceSwap", "actionCardsDiscarded",
  "defenseDecisionPhase", "defensePlayed", "defenseCommittedPrivate", "passDefense",
  "combatBlocked", "becomeWanderer", "wandererSteal", "wandererReborn",
  "martyrdomStart", "martyrdomAttackerCommitted", "martyrdomRepresentativePhase",
  "martyrdomRepresentativeChosen", "martyrdomAssignedToYou",
  "martyrdomBelieverCommitted", "martyrdomDefendersChoose", "martyrdomResolved",
  "faithDebateStart", "faithDebateRepresentativePhase",
  "faithDebateRepresentativeChosen", "faithDebateRound", "faithDebateCardPlayed",
  "faithDebateResult", "faithDebateStopped", "faithDebateStopProposed",
  "faithDebateStopRejected", "faithDebateStopRejectedPrivate", "faithDebateEnd",
  "conspiracyRepresentativePhase", "witchHuntStart", "witchHunt",
  "conspiracyRepresentativeChosen", "conspiracyAssignedToYou",
  "conspiracyDefendersChoose", "conspiracyStart", "conspiracyBelieverCommitted",
  "conspiracyResolved", "faithWarStart", "faithWarRepresentativePhase",
  "faithWarRepresentativeChosen", "faithWarAssignedToYou", "faithWarRound",
  "faithWarCardPlayed", "duelResult", "duelBonus", "faithWarEnd",
  "combatSnapshotHistory", "gameEndedByRule", "breakingFaithResolved",
  "finalStruggleStart", "finalInfiniteWarStarted", "finalStruggleConspiracyEnd",
  "kowtowToMe", "publicCountsSync", "skillKarboom", "skillHeadstronger",
  "skillPurpleHermitActivated", "skillPurpleHermitFinale",
  "skillGateTruthPurpleHermit", "skillGateTruthCopied", "skillAscendWithMe",
  "skillPraiseLife", "skillWorldPeace", "skillEternalTruth",
  "skillSoulSeveringSword", "soulBladeMarked", "soulBladeTurnSkipped",
  "soulBladeTurnSkippedPrivate", "skillEveryoneEqual", "skillChaosComing",
  "skillAutoDefense", "skillHolyRebirth", "reverseKarmaStatus",
  "prophetPredictionStarted", "prophetPredictionResolved", "prophetGuessChosen",
  "prophetGuessPassed", "skillRevealed", "impermanenceFailed",
  "impermanenceVictoryShowcase", "gameEndSummaryShow", "gameEndSummaryClosing",
  "skillHiddenReset", "skillCardReplaced", "initialSkillActivePlayerChanged",
  "syncBelieverHand", "syncActionHand", "skillStateUpdated", "playerIdentitySync",
  "practiceAiPlayersChanged", "practiceAiStepRequested", "soloActorChanged",
  "botThinking", "kowtowForcedAbsorbed",
];

const LOG_ONLY_NOTIFICATIONS = [
  "combatRoundHistory", "endTurn", "finalStruggleEnd", "finalTieBreakFallback",
  "giveBeliever", "leaderReplaced", "leaderSupportDecision", "secretAllianceStarted",
  "surrenderAccepted", "surrenderAsked", "surrenderRejected", "wandererTurnStart",
];

export function notificationPresentationBindings() {
  return [
    ...HANDLER_NOTIFICATIONS.map((name) => [name, `notif_${name}`]),
    ...LOG_ONLY_NOTIFICATIONS.map((name) => [name, "notif_genericLogOnly"]),
  ];
}

export function subscribeNotificationPresentation(subscribe, target) {
  const seen = new Set();
  for (const [name, handler] of notificationPresentationBindings()) {
    if (seen.has(name)) {
      throw new Error(`Duplicate notification presentation: ${name}`);
    }
    seen.add(name);
    subscribe(name, target, handler);
  }
  return seen.size;
}
