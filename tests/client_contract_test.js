"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const gameSource = fs.readFileSync(
  path.join(__dirname, "..", "modules", "js", "Game.js"),
  "utf8"
);

assert.match(
  gameSource,
  /gamestate\.args\s*=\s*Object\.assign\(\{\},\s*normalizedArgs\)/,
  "Entering a state must replace the previous args snapshot."
);
assert.doesNotMatch(
  gameSource,
  /Object\.assign\(\s*\{\},\s*this\.gamedatas\.gamestate\.args\s*\|\|\s*\{\},\s*normalizedArgs/,
  "State args must not merge keys left by the previous state."
);

assert.match(
  gameSource,
  /confrontation_id:\s*confrontationId/,
  "Persisted duel history must include its confrontation identity."
);
assert.match(
  gameSource,
  /parseInt\(payload\.confrontation_id\s*\|\|\s*0,\s*10\)\s*!==\s*expectedConfrontationId/,
  "Duel history must only restore into the confrontation that created it."
);

assert.doesNotMatch(
  gameSource,
  /const believerCountElem = dojo\.byId\("table_believer_count_" \+ actorId\);/,
  "Believer draw animations must not change the public count before cards land."
);
assert.doesNotMatch(
  gameSource,
  /table_believer_count_[\s\S]{0,200}parseInt\(countElem\.innerHTML\) \+ notif\.args\.cards\.length/,
  "Private hand sync must not increment the public count ahead of the effect."
);
assert.match(
  gameSource,
  /import \{[\s\S]{0,120}createPublicCountLanding,[\s\S]{0,80}from "\.\/PublicCountLanding\.js";/,
  "Authoritative public counts must use the landing coordinator."
);
assert.match(
  gameSource,
  /notif_publicCountsSync:\s*function[\s\S]{0,900}publicCountLanding\.receive\(payload, postRevealFlightDelay\)/,
  "The public-count notification must delegate snapshot timing to the coordinator."
);
assert.doesNotMatch(
  gameSource,
  /pendingPublicCountsSync(?:Timeout|Payload)/,
  "Public-count timing state must not return to the DOM notification handler."
);

assert.match(
  gameSource,
  /lockAllHandStocks:\s*function \(\)[\s\S]{0,300}\["playerActionCards", "playerBelieverCards", "playerSkillCards"\]/,
  "The solo-turn hard lock must also disable Skill-card interaction."
);
assert.match(
  gameSource,
  /getCurrentActiveSeatIds:\s*function[\s\S]{0,500}getTurnInteractionProjection\([\s\S]{0,200}\.activeActorIds/,
  "The AI watchdog must use the shared turn projection during actor recovery."
);

const actionButtonOwnershipBlock = gameSource.match(
  /const canRenderCurrentStateButtons =[\s\S]*?if \(stateName === "chooseInitialSkill"\)/
);
assert.ok(
  actionButtonOwnershipBlock,
  "The action-button ownership gate must remain identifiable."
);
assert.doesNotMatch(
  actionButtonOwnershipBlock[0],
  /isCurrentPlayerActive\(\)/,
  "Action-button ownership must use the shared interaction projection."
);
assert.match(
  gameSource,
  /onUseSkillButtonClicked:[\s\S]{0,1200}getTurnInteractionProjection\("playerTurn"\)\.localCanAct/,
  "Direct Skill use must use the shared interaction projection fallback."
);
assert.doesNotMatch(
  gameSource,
  /soloBotOwnsActiveState:\s*function/,
  "The obsolete solo-only ownership facade must not return."
);
assert.match(
  gameSource,
  /import \{ projectActionCardReadiness \} from "\.\/ActionCardReadinessProjection\.js";/,
  "Action-card readiness must use the pure projection module."
);
assert.match(
  gameSource,
  /const readiness = projectActionCardReadiness\(\{/,
  "The Action-card DOM adapter must delegate its policy decision."
);
assert.doesNotMatch(
  gameSource,
  /const targetRequiredCards = \{/,
  "Action-card policy lists must not return to the DOM adapter."
);
assert.match(
  gameSource,
  /import \{ projectBelieverCardReadiness \} from "\.\/BelieverCardReadinessProjection\.js";/,
  "Believer-card readiness must use the pure projection module."
);
assert.match(
  gameSource,
  /getBelieverCardReadinessProjection:\s*function[\s\S]{0,1200}projectBelieverCardReadiness\(\{/,
  "The Believer-card adapter must delegate its policy decision."
);
assert.doesNotMatch(
  gameSource,
  /shouldBelieverHandBeReady:\s*function/,
  "The old distributed Believer-readiness policy must not return."
);
assert.match(
  gameSource,
  /import \{ projectSkillCardReadiness \} from "\.\/SkillCardReadinessProjection\.js";/,
  "Skill-card readiness must use the pure projection module."
);
assert.match(
  gameSource,
  /const skillCardReadiness = projectSkillCardReadiness\(\{/,
  "Skill-card selection mode must delegate to the shared projection."
);
assert.match(
  gameSource,
  /import \{ createVisualEffectTransactions \} from "\.\/VisualEffectTransactions\.js";/,
  "Card visuals must use the shared visual-effect transaction module."
);
assert.match(
  gameSource,
  /playSkillCenterUse:\s*function[\s\S]{0,300}aiStepPacing\.markSkillVisual\(actor\)/,
  "Skill visuals must mark the actor for post-animation AI pacing."
);
assert.match(
  gameSource,
  /notif_practiceAiStepRequested:[\s\S]{0,3500}aiStepPacing\.schedule\(/,
  "Practice-AI requests must delegate their lifecycle to the pacing module."
);
const practiceAiStepHandler = gameSource.match(
  /notif_practiceAiStepRequested:\s*function[\s\S]*?\n\s*},\n\n\s*sendPracticeAiStep:/
);
assert.ok(practiceAiStepHandler, "The practice-AI step handler must be identifiable.");
assert.doesNotMatch(
  practiceAiStepHandler[0],
  /setTimeout\(|getTableAnimationBusyMs\(/,
  "The practice-AI handler must not poll timers or scattered visual flags."
);
assert.doesNotMatch(
  gameSource,
  /pendingPracticeAiStepTimers|setTimeout\(settleStep/,
  "Practice-AI pacing must not recreate scattered settle-loop timers."
);
assert.match(
  gameSource,
  /waitForVisuals:[\s\S]{0,250}visualEffectTransactions\.whenSettled\(/,
  "AI pacing must wait through the visual-transaction settlement interface."
);
assert.match(
  gameSource,
  /notif_actionCardPlayed:[\s\S]{0,2600}beginCenterActionVisualTransaction\([\s\S]{0,500}visualTransaction\.isCurrent\(\)/,
  "General Action-card reveal callbacks must belong to the current visual transaction."
);
const centerDiscardScheduler = gameSource.match(
  /scheduleCenterActionCardToDiscard:\s*function[\s\S]*?\n\s*},\n\n\s*clearProphetPendingPredictionVisual/
);
assert.ok(
  centerDiscardScheduler,
  "The center Action-card discard scheduler must remain identifiable."
);
assert.match(
  centerDiscardScheduler[0],
  /transaction\.schedule\(/,
  "Center Action-card discard must be scheduled through its visual transaction."
);
assert.doesNotMatch(
  centerDiscardScheduler[0],
  /setTimeout\(/,
  "Center Action-card discard must not create an unmanaged timer."
);
assert.doesNotMatch(
  gameSource,
  /clearTimeout\(this\.pendingCenterActionDiscardTimeout\)/,
  "Center Action-card cancellation must go through the visual transaction."
);
assert.match(
  gameSource,
  /const DUEL_ROUND_VISUAL_TRANSACTION = "duelRound";/,
  "Duel rounds must have a dedicated visual transaction channel."
);
assert.match(
  gameSource,
  /const AOE_VISUAL_TRANSACTION = "aoe";/,
  "AOE confrontations must have a dedicated visual transaction channel."
);
assert.match(
  gameSource,
  /const SKILL_CENTER_VISUAL_TRANSACTION = "skillCenter";/,
  "Ordinary Skill center use must have a dedicated visual transaction channel."
);
assert.match(
  gameSource,
  /const PROPHET_VISUAL_TRANSACTION = "prophet";/,
  "The multi-stage Prophet flow must have a dedicated visual transaction channel."
);
assert.match(
  gameSource,
  /const DEFENSE_BLOCK_VISUAL_TRANSACTION = "defenseBlock";/,
  "Defense overlays and their staged exit must have a dedicated transaction channel."
);
assert.match(
  gameSource,
  /const REDISTRIBUTE_VISUAL_TRANSACTION = "redistribute";/,
  "Global hand redistribution must have a dedicated transaction channel."
);
assert.match(
  gameSource,
  /const REVIVAL_VISUAL_TRANSACTION = "revival";/,
  "Staged revival must have a dedicated transaction channel."
);
assert.match(
  gameSource,
  /notif_prophetPredictionStarted:\s*function[\s\S]{0,260}beginProphetVisualTransaction\(/,
  "A Prophet prediction start must replace the previous Prophet transaction."
);
assert.match(
  gameSource,
  /notif_prophetPredictionResolved:\s*function[\s\S]{0,350}getCurrentProphetVisualTransaction\(/,
  "Partial and final Prophet resolution must continue the current transaction."
);
assert.match(
  gameSource,
  /attachCenterAttackDefenseOverlay:\s*function[\s\S]{0,260}beginDefenseBlockVisualTransaction\("center"\)/,
  "A center defense overlay must replace the previous defense transaction."
);
assert.match(
  gameSource,
  /attachFaithWarDefenseOverlay:\s*function[\s\S]{0,220}beginDefenseBlockVisualTransaction\("duel"\)/,
  "A duel defense overlay must replace the previous defense transaction."
);
const defenseBlockExit = gameSource.match(
  /maybeRunDefenseBlockExit:\s*function[\s\S]*?\n\s*},\n\n\s*\/\/ Face-up defense/
);
assert.ok(defenseBlockExit, "The defense block exit must remain identifiable.");
assert.match(
  defenseBlockExit[0],
  /visualTransaction\.schedule\(/,
  "Defense hold and exit timing must be owned by its transaction."
);
assert.doesNotMatch(
  defenseBlockExit[0],
  /setTimeout\(/,
  "Defense block exit must not create an unmanaged timer."
);
const redistributeFlow = gameSource.match(
  /playGlobalHandRedistributeFx:\s*function[\s\S]*?\n\s*},\n\n\s*playEveryoneEqualShuffleFx/
);
assert.ok(redistributeFlow, "The global redistribute flow must remain identifiable.");
assert.match(
  redistributeFlow[0],
  /beginRedistributeVisualTransaction\(cardKind\)/,
  "Every global redistribution must replace the previous transaction."
);
assert.doesNotMatch(
  redistributeFlow[0],
  /setTimeout\(/,
  "Redistribution stages must not create unmanaged timers."
);
assert.match(
  gameSource,
  /animateCardFlightBatch:\s*function[\s\S]{0,1800}transaction:\s*transaction/,
  "Batch card flights must propagate their owning visual transaction."
);
const stagedRevival = gameSource.match(
  /animateStagedGraveReveal:\s*function[\s\S]*?\n\s*},\n\n\s*\/\/ Recruit-card-anchored reveal/
);
assert.ok(stagedRevival, "The shared staged revival flow must remain identifiable.");
assert.match(
  stagedRevival[0],
  /visualTransaction\.schedule\(/,
  "Revival reveal, hold, and cleanup must be owned by one transaction."
);
assert.doesNotMatch(
  stagedRevival[0],
  /setTimeout\(/,
  "The active staged revival flow must not create unmanaged timers."
);
const aoeDefenseFlip = gameSource.match(
  /animateAoeDefenseFlipReveal:\s*function[\s\S]*?\n\s*},\n\n\s*revealAoeBelievers/
);
assert.ok(aoeDefenseFlip, "The AOE defense flip helper must remain identifiable.");
assert.match(
  aoeDefenseFlip[0],
  /const schedule\s*=\s*[\s\S]{0,160}setTimeout/,
  "AOE defense flip must define the scheduler used by every flip stage."
);
assert.match(
  gameSource,
  /playSkillCenterUse:\s*function[\s\S]{0,500}beginSkillCenterVisualTransaction\(/,
  "Every ordinary Skill center use must replace the previous Skill transaction."
);
assert.match(
  gameSource,
  /const sendBack = function[\s\S]{0,160}visualTransaction\.isCurrent\(\)/,
  "A stale Skill callback must not send cards home from a newer visual."
);
const skillCenterUse = gameSource.match(
  /playSkillCenterUse:\s*function[\s\S]*?\n\s*},\n\n\s*notif_skillKarboom/
);
assert.ok(skillCenterUse, "The ordinary Skill center-use flow must remain identifiable.");
assert.doesNotMatch(
  skillCenterUse[0],
  /setTimeout\(/,
  "Ordinary Skill center-use timers must be owned by the visual transaction."
);
assert.match(
  gameSource,
  /notif_martyrdomStart:\s*function[\s\S]{0,180}beginAoeVisualTransaction\("martyrdom"\)/,
  "Each Martyrdom must replace the previous AOE visual transaction."
);
assert.match(
  gameSource,
  /notif_conspiracyStart:\s*function[\s\S]{0,350}beginAoeVisualTransaction\("conspiracy"\)/,
  "Each Conspiracy round must replace the previous AOE visual transaction."
);
const aoeCleanupScheduler = gameSource.match(
  /clearTransientArenaAfterAction:\s*function[\s\S]*?\n\s*},\n\n\s*getCurrentStateName/
);
assert.ok(
  aoeCleanupScheduler,
  "The transient-arena cleanup must remain identifiable."
);
assert.match(
  aoeCleanupScheduler[0],
  /visualTransaction\.schedule\(/,
  "AOE cleanup must be scheduled through its visual transaction."
);
assert.match(
  gameSource,
  /notif_martyrdomResolved:\s*function[\s\S]*?runAfterCombatRevealGate\([\s\S]*?visualTransaction\s*\n\s*\);/,
  "Martyrdom reveal, return flights, and cleanup must share one transaction."
);
assert.match(
  gameSource,
  /notif_conspiracyResolved:\s*function[\s\S]*?runAfterCombatRevealGate\([\s\S]*?visualTransaction\s*\n\s*\);/,
  "Conspiracy reveal, return flights, and cleanup must share one transaction."
);
assert.match(
  gameSource,
  /notif_faithDebateRound:[\s\S]{0,1200}beginDuelRoundVisualTransaction\("debate"/,
  "Each Faith Debate round must replace the previous round transaction."
);
assert.match(
  gameSource,
  /notif_faithWarRound:[\s\S]{0,1800}beginDuelRoundVisualTransaction\("war"/,
  "Each Faith War round must replace the previous round transaction."
);
const duelSetupScheduler = gameSource.match(
  /scheduleDuelRoundSetup:\s*function[\s\S]*?\n\s*},\n\n\s*applyDuelResultVisualAndLog/
);
assert.ok(duelSetupScheduler, "The duel-round schedulers must remain identifiable.");
assert.match(
  duelSetupScheduler[0],
  /transaction\.schedule\(/,
  "Duel-round setup and cleanup must be owned by their visual transaction."
);
assert.doesNotMatch(
  duelSetupScheduler[0],
  /setTimeout\(/,
  "Duel-round setup and cleanup must not create unmanaged timers."
);
assert.doesNotMatch(
  gameSource,
  /clearTimeout\(this\.(?:pendingDuelRoundSetupTimeout|faithWarCleanupTimeout)\)/,
  "Duel-round cancellation must go through the visual transaction."
);
assert.match(
  gameSource,
  /animateBelieverFlipReveal:\s*function[\s\S]{0,1800}syncBelieverCardTextOverlay\(node, type\)[\s\S]{0,300}node\.offsetHeight/,
  "Believer text must be attached synchronously while the card flips face-up."
);

const duelFaceDownRenderer = gameSource.match(
  /renderFaithWarFaceDownCard:\s*function[\s\S]*?\n\s*},\n\n\s*revealFaithWarCard/
);
assert.ok(duelFaceDownRenderer, "The duel facedown renderer must remain identifiable.");
assert.match(
  duelFaceDownRenderer[0],
  /currentDuelLeftId[\s\S]{0,500}currentDuelRightId[\s\S]{0,500}return;/,
  "A delayed commit from a player outside the current duel must be ignored."
);
assert.match(
  duelFaceDownRenderer[0],
  /targetSlot\.innerHTML\s*=\s*""/,
  "A duel side must be cleared before its one facedown card is rendered."
);
assert.doesNotMatch(
  duelFaceDownRenderer[0],
  /leftSlot\.innerHTML\s*===\s*""\s*\?\s*leftSlot\s*:\s*rightSlot/,
  "Duel commits must not fall back to whichever side merely looks empty."
);

const duelReveal = gameSource.match(
  /revealFaithWarCard:\s*function[\s\S]*?\n\s*},\n\n\s*clearFaithWarArena/
);
assert.ok(duelReveal, "The duel reveal helper must remain identifiable.");
assert.match(
  duelReveal[0],
  /faith-war-player-card[\s\S]{0,500}dojo\.destroy/,
  "Revealing a duel card must remove extra nodes from that side."
);

const localHandCounterSync = gameSource.match(
  /syncCurrentPlayerHandCounters:\s*function[\s\S]*?\n\s*},\n\n\s*escapeHtml/
);
assert.ok(localHandCounterSync, "The local hand counter sync must remain identifiable.");
assert.doesNotMatch(
  localHandCounterSync[0],
  /table_believer_count_|believerCount/,
  "Private Believer hand mutations must never rewrite the public Believer badge."
);

const partialProphetCleanup = gameSource.match(
  /Partial resolve \(first reveal done\)[\s\S]*?\n\s*}\n\s*}\n\s*},\n\n\s*\/\/ ---- Prophet skill-card parking/
);
assert.ok(
  partialProphetCleanup,
  "The partial Prophet cleanup block must remain identifiable."
);
assert.match(
  partialProphetCleanup[0],
  /Object\.keys\(this\.prophetParkedSkills \|\| \{\}\)/,
  "Partial Prophet cleanup must use the cards actually parked on this client."
);
assert.doesNotMatch(
  partialProphetCleanup[0],
  /args\.primary_prophet_id/,
  "Partial Prophet cleanup must not depend on a visibility-redacted player id."
);

const directFrameworkActiveChecks =
  gameSource.match(/this\.isCurrentPlayerActive\(\)/g) || [];
assert.equal(
  directFrameworkActiveChecks.length,
  2,
  "Direct framework-active checks must stay confined to the turn projection adapter."
);

console.log("Client contract tests passed.");
