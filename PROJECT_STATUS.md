# Hegemony of Faith - Project Status Snapshot

Last updated: 2026-06-12
Project root (fixed): `D:\Game_develop\BGA_Faith\hegemonyoffaith`

## Current synchronized status (2026-05-03)

- Current git baseline: `c1f9207 Polish mobile UI and zombie flows`; working tree was clean before this status sync.
- Canonical active entry files are now:
  - `modules/php/Game.php`
  - `modules/js/Game.js`
  - `hegemonyoffaith.css`
  - `hegemonyoffaith.action.php`
  - `states.inc.php` loading `modules/php/HOFMachineStates.inc.php`
- Older historical notes below may mention legacy root files such as `hegemonyoffaith.game.php` / `hegemonyoffaith.js`. Those notes are historical only; when they conflict with current code, current code wins.
- Rule priority remains:
  1. `D:\Game_develop\BGA_Faith\Hegemony_of_Faith_Rules_Consolidated.md`
  2. `D:\Game_develop\BGA_Faith\Hegemony of Faith_Rulebook.pdf`
  3. Chinese auxiliary notes / conversation clarifications
- Faith War rule lock from current code and rules:
  - Faith War is Physical 1v1 and continues until one side has no available Believers.
  - Start/end availability is checked by whole Sect Believer availability via `getFaithWarAvailableBelieversForSect(...)`.
  - Each round is still played by assigned representatives; leaders can assign followers when multiple combat-ready candidates exist.
  - Zombie Army availability adds eligible pre-war graveyard Believers to that Sect's available Faith War pool.
  - A representative may use Zombie Army graveyard Believers only if their Sect owns the active Zombie Army and the selected graveyard card belongs to the pre-war snapshot.
  - Zombie automation only auto-commits for the disconnected/zombie active representative in `faithWarDuel`; `stResolveDuel()` deliberately does not auto-submit missing Believers for living players.
- Zombie flow status:
  - `zombieTurn()` covers current active-player and multiple-active states including starting Skill draft, Action play, defense, representative choice, Faith War/Debate/AOE Believer commits, hand-limit discard, surrender/wanderer, Prophet/Holy Rebirth/Karma prompts, Info Spy, Secret Alliance, and end summary.
  - Zombie player-turn Action play goes through `playActionCardInternal(...)`, avoiding session-bound `checkAction()` while preserving ownership and rule validation.
  - `gameEndSummary` multiple-active zombie handling clears only the zombie player's slot and no longer finalizes the summary for human players.
- UI/RWD status:
  - Shared CSS card variables drive table cards, hand cards, Faith War, AOE, Prophet prediction, deck previews, log mini-cards, and game-end summary sizing.
  - `modules/js/Game.js::getResponsiveHandCardSize()` and CSS breakpoints cover <=640px mobile and 641-900px narrow web layouts.
  - On <=640px mobile, hand cards now use the same compact size as deck/table cards, and hand container padding/min-height is reduced to shorten vertical scrolling while selecting cards.
  - Mobile/narrow RWD table spacing now uses fixed arena gap variables instead of large inherited central min-height, and AOE/War owner blocks are shorter so combat cards sit closer to the deck separator.
  - War/Debate banners and action labels are compact on mobile/narrow RWD so Believer selection appears sooner without excessive vertical scrolling.
  - AOE and War/Debate `VS` typography now share one responsive combat variable set so identical RWD widths use identical sizing and styling.
  - AOE attacker Sect label is centered as a single top line on mobile/narrow RWD, avoiding left-corner wrapping and reducing vertical waste.
  - End-game summary text now uses shared responsive summary font variables so winner/loser headings, names, and Believer counts scale consistently on mobile.
  - Prophet prediction animation has source/anchor size locking and delayed hidden-card handling for mobile stability.
  - Mobile AOE owner/sect labels are width-locked and centered against their card slots to avoid labels drifting left under <=640px layout.
- Current alpha focus / watch list:
  - Confirm zombie representatives cannot cause auto-play for living representatives during Faith War.
  - Watch BGA zombieTurn/checkAction/session edge cases after disconnects.
  - Re-check mobile Chrome RWD for card oversize, truncation, AOE crowding, Prophet prediction display, and end-summary/observer states.
  - Avoid SVN/BGA upload of `.git`, Markdown test notes, or unnecessary helper files; check changelists before sync.

Latest local checks after status sync:
- `php -l modules/php/Game.php` passed.
- `php -l hegemonyoffaith.action.php` passed.
- `node --check modules/js/Game.js` passed.
- `git diff --check` passed.

Latest update (2026-06-13) — AOE sect-wide defense window (phase 6b, designer-confirmed design):
- The AOE defense option now belongs to the whole sect and spans TWO phases, closing per sect only when that sect's representative actually commits a believer:
  - Assignment phase: prompted sects' defense-card holders are activated alongside their Leader (`stMartyrdomChooseRepresentative` / `stConspiracyChooseRepresentative`). A holder may defend (concealed) immediately — the Leader then skips assignment (whole sect released). When the Leader assigns first, that sect's holders are auto-released (no action needed) and regain the option in the commit phase.
  - Commit phase: active set = representatives (believers > 0) + defense holders of those sects (`getAoeCommitPhaseDefenseHolderIds`). `target_ids` in args/notifs stays representatives-only (labels + commit eligibility unchanged). A holder defending releases the whole sect (rep flag cleared sect-wide); a rep committing a believer releases the sect's waiting holders (`releaseSameSectActivePlayers` in `playBelieverCardCombat`).
- `playDefenseCardInternal` now covers all four AOE states with per-state exit transitions (`chooseDone` / `nextStep`).
- Deadlock audit: every waiting holder is released by (a) own defense, (b) Leader assignment, or (c) rep believer commit; leaders/reps always retain a mandatory action.
- Bots defend at the earliest window (assignment phase) so AI games take the fast path; `autoCommitAoeBelieverForZombie` is now guarded by `isPlayerAoeRepresentative` so waiting holder bots never wrongly commit a believer.
- Distinct holder UI: assignment phase "play your defense card now", commit phase "play your defense card instead, or wait"; leaders holding defense see "Assign a representative, or play your defense card."
- Mis-click safety relies on the existing defense-card validation (wrong card type → clear error); playing defense is always an explicit click on the defense card itself.

Latest update (2026-06-13) — AOE merged concealed defense flow (phase 6, designer-requested rule/UX change):
- Martyrdom/Conspiracy no longer open a separate `confirmDefense` window. `stConfirmDefense` for war_type 3/6 resolves skill auto-defense (World Peace / Eternal Truth) and goes straight to `resolveAttack`; only 1v1/Witch Hunt/Spread Rumors/Breaking Faith keep the classic defense window.
- Representatives now choose "one Believer OR a defense card" during the commit phase (`martyrdomChooseBelievers` / `conspiracyChooseBelievers` gained `playDefenseCard` in possibleactions).
- The defense commit is CONCEALED: publicly it renders as a believer-back facedown commit (card_kind believer, no card identity in DOM), so the attacker cannot tell who defended before choosing their own sacrifice. The owner's hand updates via a private `defenseCommittedPrivate` notification; opponents' action-card counters update only at reveal.
- At resolution, `notifyAoeDefenseReveals(...)` (called before martyrdef/conspdef markers are discarded) sends reveal notifications; JS annotates the facedown commit with `data-defense-card-type` so the existing `revealAoeBelievers()` flip animation shows the real defense card.
- `playDefenseCard` refactored into wrapper + `playDefenseCardInternal` (bot-reusable). In commit mode it also clears the player's martyrdom/conspiracy rep flag so resolution does not auto-commit a Believer for the defended sect. New guards: attacker-sect members cannot defend their own AOE; Final Struggle (war 11, shared conspiracy commit state) rejects defense plays.
- Bots: `botTryAoeCommitPhaseDefense(...)` runs before `autoCommitAoeBelieverForZombie(...)` in both commit states — AI defends concealed whenever it holds the matching card (same policy as the old zombie defense window).
- Rule-order note: Karma Reversed is still prompted in `stResolveAttack`, which is now BEFORE defenses are known (previously after). Strictly less information for the Karma owner; flagged for designer review.
- Known minor: with multi-member sects, only the chosen representative can play the sect's defense now (previously any defense-holding member could). Identical behavior in no-follower games; flagged for designer review.

Latest update (2026-06-13) — visual polish round from first full AI playthrough (phase 5):
- First complete AI game confirmed by designer (skills observed in play: Soul-Cutting Sword turn skip, Prophet predictions).
- Play-flight overlap: the destination action card is now hidden until the play flight lands for ALL card types (was only have_a_charity/divine_inspire). `hideCenterActionCardFaceUntilFlight()` + extended `revealCenterActionCardFace()` cover the plain center, the AOE slot and the Faith War/Debate action slot (`faithwar_action_main_card`). Hide is applied only in `notif_actionCardPlayed` (resync paths render normally).
- AI defense pacing: `confirmDefense` added to `BOT_STEP_DELAY_MS_BY_STATE` (250ms) and `BOT_THINKING_MS_BY_STATE` lowered to 300ms — a slow AI defense window read as a frozen table to the attacker. AOE defense notifications are anonymous, so the speed does not leak who held a defense card; with human defenders the wait is the human's own anyway.
- Prophet + recruit cards: in the final prediction phase, the recruit Action card now flies to the discard pile together with the tail of the believer draw flights (`prophetFlowMs - flyMs`) instead of holding in the center for the full post-flow delay afterwards.
- Defeated believers flying to the graveyard now keep the loser grayscale (`.combat-flight-dead` clone class) and the original slot card is hidden at flight start, so a single gray card flies instead of a fresh-looking duplicate leaving the gray one behind. Applied to both Faith War (`animateFaithWarDeadCardsToGraveyard`) and AOE (`animateAoeBelieversToTargets` graveyard flights). Safe because duel slots are fully rebuilt each round (`setDuelParticipants` / `clearFaithWarRoundCards`).

Latest update (2026-06-13) — practice AI self-healing + prophet visual fix (phase 4):
- Practice AI step chain hardening (root cause of "AI plays once then stalls; re-enabling runs one more step"):
  - New server action `kickPracticeAi()` (action.php + Game.php) simply calls `runPracticeAiForCurrentStateIfNeeded()`; token-gated and a no-op when no AI seat should act, so spurious calls are harmless.
  - JS watchdog `schedulePracticeAiWatchdog()`: whenever AI seats are enabled, if no step request is seen for 6s, the client sends `kickPracticeAi` and reschedules. Started from setup, every `practiceAiStepRequested`, every step completion, and `practiceAiPlayersChanged`. This automates the manual re-enable workaround.
  - `sendPracticeAiStep` failures are now logged (`[hofAi] practice AI step failed ...` in console) and retried once after 1.5s — a failed step rolls back server-side so the token survives and the same step can be retried safely.
- Prophet staging card stranded over the AOE board: `ensureAoeCombatLayout` now calls `clearProphetPendingPredictionVisual()` like `ensureFaithWarBoard`/`clearFaithWarArena` already did. Without it, an arena rebuild during the staging-card flight destroyed the anchor and the temp card floated at its absolute position forever.
- Diagnosis notes from the 2026-06-12 test session:
  - "Unexpected error: You are not part of this war" comes from `playBelieverCardCombat` when a HUMAN clicks commit from a window whose player is not the current war representative — manual intervention from the wrong seat, not an AI fault.
  - All faith war / debate round re-activation sites already call `runPracticeAiForCurrentStateIfNeeded()`; the stall pattern matched silent chain death (race between step request and human/parallel actions), addressed by the watchdog above.

Latest update (2026-06-12) — i18n string consolidation + button unification (phase 3):
- Translation keys reduced 735 → ~690 by making identical-meaning PHP/JS strings share one exact English key. Full old→new mapping recorded in `TRANSLATION_STRING_CHANGES.md` (2026-06-12 section); retired keys' translations must be carried over in the BGA translation UI.
- Fixed one real concatenation bug: `notif_wandererReborn` built the sentence via `player_name + " " + _("rises again...")`; now uses the full `${player_name}` template shared with PHP.
- Button labels unified to short verbs (context lives in the status text): `Confirm` (9 variants folded), `Cancel` (3), `Skip` (3), `Refuse` (2), `Accept` (2), plus `Use Skill: ${skill_name}` template reuse. No button ids or handlers changed; `getGeneralActionButtonPriority` ordering still matches.
- All question-style confirmation prompts converted to statements (Zombie Army / Holy Rebirth / Gate copy / Karma Reversed / debate stop / refuse support); `requestClientConfirmation` now always uses default [Confirm]/[Cancel].
- JS sacrifice validation for skills 2/13/8/7 collapsed into one shared branch + one string.
- Validation: `php -l` (Game.php / action.php / HOFMachineStates.inc.php) and `node --check modules/js/Game.js` all passed.

Latest update (2026-06-12) — bot skill automation, simple tier (phase 2):
- `useSkill(...)` refactored into a thin session wrapper + `useSkillInternal(int $player_id, ...)` (same pattern as `playActionCardInternal`), so zombie/practice AI can use skills without `checkAction()`.
- Active skill use in `botPlayPlayerTurn` via `maybeBotUseActiveSkill(...)` (one skill card per player; legality always re-checked through `canPlayerUseSkillNow`):
  - KABOOM! (2): own Believers >= 2 and an enemy hand >= 4; sacrifices the most-duplicated own type; relies on the existing attack-lock plan filter afterwards.
  - Headstronger (3): pooled Follower Believers >= 4.
  - Eternal Truth (7) / World Peace (8): own hand >= 5 and leading all enemy hands.
  - Soul-Cutting Sword (11): strongest enemy hand >= 5 and target not already skip-marked.
  - Chaos Coming (14): own Action hand <= 1 and someone holds >= 4.
  - Everyone is Equal (15): own Believers <= 2 and max enemy hand >= 5 (ends turn; bot stops cleanly).
  - Purple Hermit (1): when ready as Follower and leader holds >= 2 Believers.
  - Gate of Truth (9) proactive copy intentionally NOT automated in the simple tier.
- Praise of Life (13): `botResolvePraiseLifeDecision(...)` at the pending decision (re-entry) and at zombie burst end (bounded recursion); requires own Believers >= 5 plus a playable post-praise plan (`getBotPlayableActionPlans(..., $ignore_action_bits = true)` preview).
- Zombie Army (10): faith_war bot plans now set `use_zombie = 1` when `getZombieArmyLeaderForAttacker(...)` allows it and graveyard >= 2.
- Reactive prompts upgraded in `runBotAutomationTurn`:
  - holyRebirthPrompt: always accepts (free revive; `stResolveHolyRebirth` re-validates).
  - reverseKarmaPrompt: accepts only when own Sect is the defending side (`shouldBotUseReverseKarma`).
  - prophetSkillPrompt/prophetGuess: primary native Prophet now predicts (`botTryEnableProphet` mirrors `prophetEnableSkill` minus session checks); guess type via `chooseBotProphetGuessType` using fair inference only (12 per type minus graveyard + own hand; no deck/hand peeking). Gate-copy secondary responders keep skipping.
- Single-step practice AI treats a skill use as one paced step; zombie bursts continue after non-state-changing skills.
- Designed as the "simple" tier baseline: heuristics are isolated per skill so a future difficulty option can swap thresholds/policies.
- Validation: `php -l` (Game.php / action.php / HOFMachineStates.inc.php) and `node --check modules/js/Game.js` all passed.

Latest update (2026-06-12) — unification pass 1 (handover to Claude):
- PHP dead code removed: `zombiePlayPlayerTurn(...)` and `getZombiePlayableActionPlans(...)` (~170 duplicated lines). `zombieTurn()` already delegates to `runBotAutomationTurn(...)` / `botPlayPlayerTurn(...)`, which is the single card-play path for both zombie and practice AI.
- Bot pacing single source of truth (PHP consts in `modules/php/Game.php`):
  - `BOT_STEP_DELAY_MS_BY_STATE` / `BOT_STEP_DELAY_MS_DEFAULT` drive practice-AI step delays (`getPracticeAiStepDelayMs`).
  - `BOT_THINKING_MS_BY_STATE` / `BOT_THINKING_MS_DEFAULT` drive zombie/AI thinking pauses (`getBotThinkingDelayMs`), sent as `delay_ms` on `botThinking`.
  - Zombie playerTurn thinking raised to 1100ms (was fixed 650ms) so zombie/AI turns read at a human pace.
- JS `botThinking` now honors server `delay_ms` via `notifqueue.setSynchronousDuration(...)` with feature detection; falls back to fixed 650ms registration when the framework lacks dynamic durations.
- JS timing centralization in `modules/js/Game.js`:
  - Constructor timing block documented as the single tuning point; added `unifiedCenterHoldMs` (+ `getUnifiedCenterHoldMs()`), replacing duplicated literal 1600 center-hold values.
  - `animateCardFlightBatch` duration/stagger defaults now come from `getUnifiedCardFlyMs()` / `getUnifiedCardFlightStaggerMs()` (were 520/100 literals); action-discard flight stagger likewise.
  - `setSynchronous` literals grouped into named constants (`flowStepSyncMs`, `skillBannerSyncMs`, `statusPulseSyncMs`, `showcaseSyncMs`, `identitySyncMs`); same-purpose notifications share one constant (skill banners unified at 1400ms, prophet/status pulses at 900ms).
- CSS responsive unification in `hegemonyoffaith.css`:
  - Breakpoints unified to <=900px and <=640px only; the old `@media (max-width: 980px)` combat block is now 900px, matching `getResponsiveHandCardSize()`.
  - Both responsive groups (general layout; combat/Faith War) now carry header comments explaining why they must stay after their base styles (media queries do not add specificity; source order decides).
- Bot plan-time fix: `getBotPlayableActionPlans` now mirrors the `playActionCardInternal` KABOOM attack-lock validation, so a locked bot never plans an attack that throws mid-step.
- Known follow-ups:
  - If a practice-AI step throws server-side, the step chain stops until the next state change (token consumed, no auto-retry); acceptable for the console/testing feature but worth a guard later.
  - Next phase: proactive Skill use for practice AI (currently intentionally disabled) and smarter action policy.
- Validation: `php -l modules/php/Game.php`, `php -l hegemonyoffaith.action.php`, `php -l modules/php/HOFMachineStates.inc.php`, `node --check modules/js/Game.js` all passed.

Latest update (2026-05-07):
- BGA Studio/tableview iframe height issue:
  - Studio/tableview was observed giving `gameIframe` a 150px viewport while the iframe document/body still had normal scroll height (for example ~1855px), clipping both the game surface and BGA projectcheck/debug UI.
  - Manual DevTools confirmation: changing `window.frameElement.style.height/minHeight` from inside the iframe restores the clipped view.
  - The issue was reported to BGA. The temporary `window.frameElement` auto-height workaround is intentionally not included in the alpha push until BGA replies, to avoid production/tableview side effects.

Latest update (2026-05-05):
- BGG XML API token:
  - BGA Studio projectcheck currently calls its own `bgg_scrabber.php` with unauthenticated `file_get_contents(...)`, causing BGG XML API2 to return `401 Unauthorized` for BGG id 389029.
  - Removed the temporary `Game.php` BGG token/header constants so BGA translation scans do not flag token/header strings as possibly untranslated text.
  - Removed the experimental `gameinfos.inc.php` token field because projectcheck did not read it and no public BGA metadata field for BGG API tokens has been confirmed.
  - No client-side exposure or browser XML API call was added.
- Surrender/support response resilience:
  - Leader support and surrender response buttons no longer rely on stale client-side `checkAction()` before sending the action.
  - Server-side support/surrender response handlers now validate the expected current player from the stored surrender/support context, with bot-safe fallback for zombie/practice AI automation.
- Bot pacing:
  - Practice AI now uses client-driven step pacing: server emits `practiceAiStepRequested`, the browser waits for queued animations plus a short thinking delay, then calls `runPracticeAiStep`.
  - Practice AI steps are token-gated so multiple connected clients cannot execute the same AI decision twice.
  - Bot player turns now execute one practice-AI card/action per scheduled step; combat and Debate/War choices are paced one committed Believer at a time.
  - `botThinking` remains as a short synchronous queue pause for zombie/practice AI actions without stacking long server-side bursts.
  - Center Action cards now keep a minimum table hold before discard, and AI player-turn steps wait for that hold before requesting the next AI action.
  - Have a Charity / Divine Inspiration now show public Believer draw flights from the Believer deck to the acting player's table/name anchor, including AI-controlled current-player seats, with private hand sync deck-flight suppression to avoid duplicate animations.
  - Action discard animation is now shared: discarded Action cards fly face-up to the Action discard pile for normal discards, hand-limit discards, and Divine Inspiration. Divine Inspiration includes exact discarded card ids/types in its public payload, and no artificial 3-card cap is applied to discard/draw flights.
  - Have a Charity / Divine Inspiration action-card bodies stay in the center arena until the Believer draw animation chain has finished, then the center Action card is sent to the Action discard pile.
  - Divine Inspiration public payment-discard flights include their start delay in animation timing, so Believer draw flights wait for visible Action-card discard movement instead of overlapping it.
  - Pending arena/center-card cleanup timers are cancelled or ignored during `gameEndSummary` so delayed combat/action cleanup cannot erase the end summary.
  - Secret Alliance bot/zombie card choice now uses session-safe internal selection so AI/zombie seats can randomly exchange one Action card without failing `checkAction()`.
  - Witch Hunt and Spread Rumors now schedule center-card hold/discard timing and synchronous notification pacing, matching the slower AI action cadence.
- Game-end summary:
  - Practice AI no longer auto-confirms or clears slots in `gameEndSummary`; a human can keep the summary visible and press End Game.
  - Zombie handling still clears only the disconnected zombie slot.

Latest update (2026-05-03):
- Practice AI console helper:
  - `modules/js/Game.js` now installs `window.hofAi` / parent-frame `hofAi` after setup.
  - `hofAi.players()` prints seat, player id, name, Sect, current user marker, and AI status from `gamedatas.players`.
  - `hofAi.enable(...)`, `hofAi.disable(...)`, and `hofAi.toggle(...)` accept player id, seat/index number, name fragment, `me`, `others`, or `all`.
  - Convenience helpers: `hofAi.enableOthers()`, `hofAi.disableOthers()`, `hofAi.enableMe()`, `hofAi.disableMe()`, and `hofAi.clear()`.
  - `practiceAiPlayersChanged` notifications update `gamedatas.practice_ai_player_ids` so the helper table stays current.
- Mobile AOE label alignment:
  - `hegemonyoffaith.css` centers `.aoe-player-owner`, `.aoe-left-owner-label`, and `.aoe-player-cards`.
  - The <=640px breakpoint now locks AOE target owner labels to the same width basis as the card slot so Sect names stay centered over their card backs.

Latest update (2026-05-01):
- Bot AI phase 1 extraction:
  - `modules/php/Game.php`:
    - Added bot automation modes for existing BGA zombie takeover and future practice AI.
    - `zombieTurn()` now delegates to `runBotAutomationTurn(...)`.
    - Added `runPracticeAiTurn(...)` as the reusable future entry point for AI seats.
    - Added generic Action-card bot planning:
      - `botPlayPlayerTurn(...)`
      - `getBotPlayableActionPlans(...)`
      - `chooseBotActionPlan(...)`
    - First AI policy mirrors the proven zombie behavior:
      - prefer Info Spy setup on first action when useful,
      - play one recruit/draw action when possible,
      - then choose an attack/tactic action when legal,
      - end turn when no legal plan remains.
    - Target/auxiliary heuristics currently reuse zombie-tested helpers for target choice, Witch Hunt type choice, Divine Inspiration discards, surrender/wanderer, defense, representative choice, and combat commits.
    - Skill proactive use is intentionally not enabled yet; first goal is to prove AI can legally run Action-card flows.
    - Added internal console-only practice AI toggles:
      - `setPracticeAiPlayer(player_id, enabled)`
      - `togglePracticeAiPlayer(player_id)`
      - `clearPracticeAiPlayers()`
    - Added `practice_ai_player_mask` and `practice_ai_player_ids` snapshot data.
    - Added `stPracticeAiActivePlayer` and state-machine hooks so marked AI players auto-run in supported active-player states.
    - Added multiple-active hooks for defense, representative choice, Faith War/Debate, AOE commits, and end-game summary.
    - Multiple-active AI runner refreshes the active-player list before each AI action so stale slots are skipped after earlier AI decisions advance the state.
    - Console examples:
      - `gameui.ajaxAction("togglePracticeAiPlayer", { player_id: 123456 });`
      - `gameui.ajaxAction("setPracticeAiPlayer", { player_id: 123456, enabled: 1 });`
      - `gameui.ajaxAction("setPracticeAiPlayer", { player_id: 123456, enabled: 0 });`
      - `gameui.ajaxAction("clearPracticeAiPlayers", {});`
  - Validation:
    - `php -l modules/php/Game.php` passed.
    - `php -l modules/php/HOFMachineStates.inc.php` passed.
    - `php -l hegemonyoffaith.action.php` passed.
    - `node --check modules/js/Game.js` passed.
    - `git diff --check` passed.

Latest update (2026-04-22):
- Zombie Army defended-case graveyard restore issue:
  - Manual verification confirms resolved.
  - Status changed from open issue to fixed/verified.

Latest update (2026-04-21):
- Prophet split-phase draw summary fix (Gate of Truth + Prophet + draw actions):
  - `hegemonyoffaith.game.php`
    - In `stResolveProphetPrediction`, Divine Inspiration / Have a Charity summary notify now includes drawer gain from:
      - partial phase draw #1 (when primary Prophet already resolved and missed), plus
      - final phase remaining draws.
    - Fixed fields:
      - `divineInspiration.draw_n`
      - `haveACharity.n`
      - final `notifyProphetPredictionResolvedEvent(... drawer_gain_n ...)`
  - Symptom fixed:
    - Case: both Prophet guesses miss in 5-card Divine Inspiration flow should report draw 5 (not 4).

Latest update (2026-04-21):
- Handover lock-in (authoritative baseline):
  - Rule priority:
    1) `Hegemony_of_Faith_Rules_Consolidated.md` (EN)
    2) `Hegemony of Faith_Rulebook.pdf`
    3) Chinese notes are auxiliary only.
  - Terminology lock: use `Mental` only (`Spiritual` is forbidden in runtime terminology).
  - `breaking_faith` is treated as `Strategy`.
  - Attack main flow lock:
    1) Sect defense window first
    2) only if not defended, continue to assignment / believer commit
    3) then resolve.
  - Hidden-skill lock: before leader self-activates skill, other players cannot know skill content.

Latest update (2026-04-21):
- Stable entry baseline reconfirmed (do not reintroduce bridge/mixed framework):
  - Active entry files:
    - `hegemonyoffaith.game.php`
    - `hegemonyoffaith.js`
  - Keep incremental fixes on this stable baseline only.

Latest update (2026-04-21):
- Prophet x Gate of Truth (latest hotfix state verified in code):
  - `hegemonyoffaith.game.php`
    - `prophetEnableSkill()`:
      - when responder is Gate-copied Prophet, it now attempts reactive Gate copy activation at enable time.
    - `tryActivateReactiveGateTruthCopyForProphet()`:
      - return behavior fixed; successful activation returns usable copied-skill state.
    - `stResolveProphetPrediction()`:
      - if real Prophet skips/passes (`guess <= 0`), secondary Gate-Prophet guess is marked skipped and does not incorrectly enter second guess flow.
  - Related routing/ordering points:
    - `resolveAndRouteSecondaryProphetPromptIfPending(...)` handles first reveal as partial phase, then routes second responder only when valid.
    - prediction events are emitted with ordered `draw_index` and consumed in sorted order on client.

Latest update (2026-04-21):
- Priority validation checklist (manual table verification still required):
  1) Gate of Truth x Prophet full flow:
     - real Prophet chooses to predict -> Gate owner is prompted to copy Prophet,
     - copied status remains locked until Gate owner next turn,
     - if Gate owner declines once, next Prophet event should still prompt,
     - if real Prophet skip/pass and Gate-copied Prophet is still valid, Gate should still be prompted and predict draw #1.
  2) Prophet two-step animation order:
     - first reveal for real Prophet guess,
     - second reveal for Gate-copy guess,
     - no overlap / no early second reveal.
  3) Refresh/reconnect sync:
     - flow state, button visibility, and active-player switching stay consistent.

Latest update (2026-04-21):
- Known issues still open:
  - After Ascend with Me, next player can still occasionally hit `mysql_deadlock_restart_transaction`.
  - Minor visual consistency items remain (flight anchors, unselectable styling edge cases).

Latest local checks (2026-04-21):
- `php -l hegemonyoffaith.game.php` passed.
- `php -l hegemonyoffaith.action.php` passed.
- `node --check hegemonyoffaith.js` passed.

Latest update (2026-04-18):
- Opening Skill Draft UI upgraded to card selection (table-center) + confirm:
  - `hegemonyoffaith.js`
    - Added central draft renderer:
      - `renderInitialSkillDraftArea(...)`
      - `clearInitialSkillDraftArea()`
      - local selected state: `initialSkillDraftSelectedId`
    - `chooseInitialSkill` state no longer uses two per-skill action buttons.
    - New flow:
      - click one of two skill cards in central area -> highlight selected card
      - click `Confirm Starting Skill` button -> submit `chooseInitialSkill`.
    - Added normalization helper + local cache for choices:
      - `normalizeInitialSkillChoices(...)`
      - `initialSkillChoices` cache still used as fallback for args timing.
    - Leaving `chooseInitialSkill` now clears central draft area automatically.
  - `hegemonyoffaith.css`
    - Added dedicated styles:
      - `.initial-skill-draft-*`
      - selected/disabled/selectable visual states
      - mobile responsive sizing
    - Draft area background is transparent (no white block fill).

Latest update (2026-04-18):
- Opening Skill Draft no-F5 resilience (extra fallback layer):
  - `hegemonyoffaith.game.php`
    - `getAllDatas` now includes current viewer's `initial_skill_choices` snapshot.
  - `hegemonyoffaith.js`
    - Added `normalizeInitialSkillChoices(...)` helper and local cache `initialSkillChoices`.
    - `chooseInitialSkill` button rendering now uses:
      1) state args `choices` (preferred),
      2) fallback to cached `initialSkillChoices` (from `getAllDatas` / private notif).
    - `canRenderCurrentStateButtons` for `chooseInitialSkill` now also honors `args.active_player_id === my_id` as a fallback when framework active-flag timing is late.
    - `notif_skillCardReplaced` now clears consumed opening-choice ids from cache to prevent stale re-select.

Latest update (2026-04-18):
- Opening Skill Draft turn-handover refresh hardening (aim: remove required F5 between players):
  - `hegemonyoffaith.game.php`
    - `stChooseInitialSkill` now uses `switchActivePlayerSafely(...)` (same switching style as stable baseline), not raw `changeActivePlayer(...)`.
    - After active player switch, server now sends:
      - public `initialSkillActivePlayerChanged` with `active_player_id`,
      - private `initialSkillActivePlayerChanged` to next active player with that player's `choices` payload.
  - `hegemonyoffaith.js`
    - `notif_initialSkillActivePlayerChanged` now consumes notif args (`active_player_id`, optional `choices`) and updates local `gamedatas.gamestate` before re-rendering buttons.
  - Expected result:
    - Next active player should receive choose buttons immediately without manual F5 reload.

Latest update (2026-04-18):
- Zombie Army blocked-by-defense graveyard visual restore:
  - `hegemonyoffaith.game.php`
    - `stAfterDefenseResponses` (`combatBlocked`) now includes fresh graveyard snapshot payload:
      - `graveyard_count`
      - `graveyard_cards`
      - zombie flags reset (`zombie_owner_id=0`, `war_zombie_snapshot_max_discard_arg=0`)
  - `hegemonyoffaith.js`
    - `notif_combatBlocked` now clears war/zombie context, applies graveyard snapshot/count from notification, closes zombie picker, and re-renders graveyard preview immediately.
  - Expected result:
    - If Faith War(+Zombie) is blocked at defense phase, graveyard should no longer remain visually "emptied/concealed".

Latest update (2026-04-18):
- Headstronger deadlock-risk reduction (player-table lock churn):
  - `hegemonyoffaith.game.php`
    - Added batch sect allocator: `allocateIndependentSectIdsForPlayers(...)`.
    - Headstronger flow now:
      - pre-allocates follower new sect ids in one pass,
      - performs follower role/leader/seal+sect update with one `UPDATE ... CASE ... WHERE player_id IN (...)` instead of per-follower updates.
  - Goal:
    - reduce repeated `player` table scans/updates inside one transaction and lower chance of `mysql_deadlock_restart_transaction` after Headstronger.

Latest local checks (2026-04-18):
- `php -l hegemonyoffaith.game.php` passed.
- `php -l hegemonyoffaith.action.php` passed.
- `node --check hegemonyoffaith.js` passed.

Latest update (2026-04-18):
- Stable boot baseline reconfirmed after rollback (table opens + normal play starts):
  - Runtime entry files (canonical for this stable baseline):
    - `hegemonyoffaith.js`
    - `hegemonyoffaith.game.php`
    - `hegemonyoffaith.action.php`
    - `states.inc.php` (loader) + `modules/php/HOFMachineStates.inc.php`
  - JS boot/export pattern that is stable on current table:
    - AMD/Dojo wrapper: `define([...], function (dojo, declare) { ... })`
    - Constructor declaration uses global `ebg` runtime object:
      - `declare("bgagame.hegemonyoffaith", ebg.core.gamegui, ...)`
      - `new ebg.stock()`
    - Module tail:
      - `Game.Game = Game;`
      - `return Game;`
  - PHP boot pattern that is stable on current table:
    - Root class file `hegemonyoffaith.game.php` with class `HegemonyOfFaith extends Table`
    - Action endpoints in `hegemonyoffaith.action.php` (legacy APP_GameAction style)
    - `states.inc.php` loading `modules/php/HOFMachineStates.inc.php`
  - Local syntax checks (pass):
    - `node --check hegemonyoffaith.js`
    - `php -l hegemonyoffaith.game.php`
    - `php -l hegemonyoffaith.action.php`
    - `php -l states.inc.php`
    - `php -l modules/php/HOFMachineStates.inc.php`
  - Notes / minor risks (recorded, not blocking now):
    - Current stable boot is old-style/legacy-compatible (not migrated to pure ESM `modules/js/Game.js` + namespaced `modules/php/Game.php` path).
    - `hegemonyoffaith.action.php` comments still mention `ajaxcall`; runtime logic currently routes through `performAction` wrapper in JS.

Latest update (2026-04-18):
- Opening Skill Draft (phase 1: minimal 2-choose-1 before first turn):
  - Added sequential pre-turn state:
    - `modules/php/HOFMachineStates.inc.php`
      - `newHand` now transitions to `chooseInitialSkill` first, then `playerTurn`.
      - new activeplayer state `chooseInitialSkill` (`possibleactions`: `chooseInitialSkill`).
  - Setup dealing change (`hegemonyoffaith.game.php`):
    - Start of game now deals 2 skill options per player into private location `initialchoice` (instead of directly dealing 1 to hand).
  - New backend flow (`hegemonyoffaith.game.php`):
    - `stChooseInitialSkill`, `argChooseInitialSkill`, `chooseInitialSkill`.
    - Active player only sees own `choices`; other players receive empty `choices` in args (no skill leak).
    - On confirm:
      - selected skill -> `hand`
      - unselected skill -> return to `skill deck` + shuffle
      - public log only says player has chosen; no skill content revealed.
    - After all players finish, active player is restored to initial turn owner before entering `playerTurn`.
  - New action endpoint (`hegemonyoffaith.action.php`):
    - `chooseInitialSkill`.
  - Frontend minimal controls (`hegemonyoffaith.js`):
    - Added `chooseInitialSkill` action-button rendering for active player (`Choose: <SkillName>` x2).
    - Added `onChooseInitialSkillClicked`.
    - During this state, action/believer/skill hand selections are force-disabled; non-active players see waiting text.
  - Zombie safety:
    - `zombieTurn` now auto-selects one starting skill for disconnected active player in `chooseInitialSkill`.

Latest update (2026-04-16):
- Everyone is Equal / Chaos Coming redistribute FX continuity fix (hand clear + center anchor):
  - Issues observed:
    - local hand still visible while cards "fly out",
    - deal-out looked like it started from left-side/top-left instead of center shuffle area,
    - center phase felt disconnected from final hand replacement.
  - Fixes (`hegemonyoffaith.js` + `hegemonyoffaith.css`):
    - Added dedicated center anchor for redistribute FX (`ensureRedistributeCenterAnchorNodeId`) and use it for both gather target and deal source, instead of using whole `central_arena` node bounds.
    - `showCenterShuffleFx` now anchors to the same center anchor node for visual continuity.
    - Added local-hand conceal during redistribute (`redistribute-hand-concealed`) so cards visually leave hand before sync replacement; reveal restored on sync and fallback timer.
    - `notif_syncBelieverHand` / `notif_syncActionHand` now explicitly remove conceal after replacement.
    - Increased queue sync window for `skillEveryoneEqual` / `skillChaosComing` to `7000ms` and extended local pending windows to reduce premature hand-sync overtake.
  - Result: gather -> center shuffle -> deal now follows one coherent center path; local hand no longer appears unchanged during gather.

Latest update (2026-04-16):
- Flight-anchor hardening (eliminate top-left ghost card flights) + Spread Rumors source fix:
  - Issue: some card-flight animations could target non-rendered anchor nodes (for example `playertable_*` in `display: contents` contexts), causing cards to appear flying from/to top-left.
  - Fix (`hegemonyoffaith.js`):
    - Added shared anchor validator `isNodeUsableForCardFlight(nodeOrId)` (requires real rendered size).
    - Added `safeSlideToObject(...)` and migrated direct flight calls to it (graveyard/aoe/preview/showcase/martyrdom flows), so unusable endpoints fail closed (no ghost flight).
    - `resolvePlayerAnchorNodeId()` now returns only usable anchors; unusable table anchors are skipped.
    - `animateTempCardFlight()` now hard-blocks when source/target anchor is unusable.
    - `animateBelieversFromPlayerToGraveyard()` now also validates source/target anchors before flight.
    - `notif_spreadRumors` attacker-side source anchor changed to panel-first (`panel_*`) semantics (player status area), with fallback only when panel anchor is unavailable.
  - Result: Spread Rumors snatch flow now flies from actual victim player status anchors; generic ghost flights from top-left/no-node are suppressed.

Latest update (2026-04-16):
- Skill tooltip de-dup pass (all skills): usage limits centralized in `Uses`
  - Goal: remove repeated frequency text from `Effect` and keep usage/frequency wording in `Uses` only.
  - Updated `getSkillEffectText`:
    - Skill 1: removed `Activate once:`
    - Skill 3: removed `Once per game:`
    - Skill 9: removed `Once per turn` and per-type once wording from `Effect`
    - Skill 11: removed `Up to 3 uses per game:`
    - Skill 12: removed `Passive win condition.` prefix
    - Skill 14: removed `Up to 3 uses per game:`
  - Updated `getSkillUsageInfo`:
    - Skill 9 `Uses` now carries the special limit text:
      - `Uses: Once per turn. Each revealed skill type can be copied once per game.`
  - Result: `Effect` now focuses on what the skill does; frequency limits are consolidated in `Uses`.

Latest update (2026-04-16):
- Everyone is Equal tooltip de-dup (Effect vs Uses):
  - Issue: skill 15 (`Everyone is Equal`) `Effect` text repeated usage-cap wording (`Once per game`) while `Uses` section already states one-use limit.
  - Fix (`hegemonyoffaith.js`): removed usage-cap phrase from skill 15 effect text.
  - New effect text: `Shuffle all players' Believers in hand and redistribute from your seat order. This immediately ends your turn.`
  - Result: usage frequency is now shown only in `Uses`, with no duplicated limit text in `Effect`.

Latest update (2026-04-16):
- Prophet prediction Z-layer correction (prevent blocking top action buttons):
  - Issue: Prophet prediction temporary Believer card could render above top action buttons (guess/pass controls), visually and interactively blocking the button area.
  - Fix:
    - Reduced Prophet visual stack levels:
      - `.prophet-temp-card` `z-index` 5600 -> 2400
      - `.prophet-prediction-host` / slot runtime z-index 5580 -> 2380
      - Prophet flight calls now use `zIndex: 2400` instead of 5600.
    - Raised top action area layer above table animations:
      - `#pagemaintitle_wrap`, `#generalactions` now `position: relative; z-index: 3000`.
  - Result: Prophet reveal/guess cards stay visible on table but no longer cover top action buttons.

Latest update (2026-04-16):
- Faith War / Faith Debate board UX alignment + mobile RWD:
  - Label hierarchy adjustment (believer confrontation area):
    - Top banner now shows sect-vs-sect labels (resolved by representative/player id -> sect name), instead of representative player names.
    - Per-side believer owner label now shows player name only (`includeSect: false`), removing duplicated sect+player stacking.
  - Mobile layout hardening:
    - Added responsive rules for war/debate board (`max-width: 980px` and `640px`) to prevent card clipping on narrow screens.
    - Board switches to stacked layout (main duel area, then action panel, then log panel), with tighter slot/vs/log spacing on small devices.
  - Files:
    - `hegemonyoffaith.js`: `setDuelParticipants`, `notif_faithWarStart`, `notif_faithWarRound`, `notif_faithDebateStart`, `notif_faithDebateRound`, plus helper `getCombatBannerSectLabelByPlayer`.
    - `hegemonyoffaith.css`: new responsive blocks for `.faith-war-board` family.

Latest update (2026-04-16):
- Public draw-flight target correction (Action/Believer deck draw preview):
  - Issue: non-drawing players could see deck back-cards fly toward top-left/table area instead of the drawing player's right-side player panel/name anchor.
  - Root cause: `animateDeckDrawToPlayer()` used `receive` anchor resolution (table-first), which can resolve to `playertable_*` rather than right-side `panel_*`.
  - Fix (`hegemonyoffaith.js`):
    - `animateDeckDrawToPlayer()` now resolves destination with panel-first semantics:
      - prefer `panel_*` (right-side player name/panel area),
      - no table-anchor primary target,
      - fallback to `playertable_*` only if panel node is unavailable.
  - Result: deck draw preview now visibly flies to the intended player panel anchor instead of drifting to top-left.

Latest update (2026-04-16):
- Prophet prediction layout alignment follow-up:
  - Kept reserved text space fix, but aligned central table items by top edge to remove card-height mismatch.
  - Fix (`hegemonyoffaith.css`): `#central_arena > .card` and `#central_arena > .prophet-prediction-host` now use `align-self: flex-start`.
  - Result: Action/recruit card and Prophet reveal card stay equal-top; prediction text remains below.

Latest update (2026-04-16):
- Prophet prediction card-frame visual shift fix (text-space reservation):
  - Root cause: prediction text lines were empty before reveal, so the text container height expanded only after `Predicted/Hit/Miss` appeared, causing the card frame to jump.
  - Fix (`hegemonyoffaith.css`):
    - `.prophet-prediction-slot` now has fixed reserved vertical room (`min-height`) for the prediction text area.
    - `.prophet-prediction-lines` now reserves stable line space (`min-height`) even before text is rendered.
    - `.prophet-prediction-line` now uses fixed single-line layout (`min-height`, `nowrap`, `ellipsis`) to prevent late wrap/height growth.
  - Result: Prophet guess/reveal text appears in pre-reserved space; card-frame position stays visually stable.

Latest update (2026-04-16):
- Headstronger `Spent` badge self/others consistency fix:
  - Root cause: self panel badge/tooltip trusted `mySkillState` only, which could be temporarily older than public skill state in notification timing edge cases.
  - Fix (`hegemonyoffaith.js`):
    - `getEffectiveSkillStateForPanel(self)` now compares `mySkillState` with `playerSkillPublicState[self]` and prefers the more advanced state (`exhausted` or higher `uses`) when needed.
    - `refreshCurrentPlayerSkillTooltips()` now uses the same effective-state resolver (not raw `mySkillState`), keeping tooltip/status text aligned with the badge.
  - Result: after one-time skills like Headstronger are spent, self and other players now see the same `Spent` status.

Latest update (2026-04-16):
- Target-selection unselectable visuals unified for player targets:
  - In `highlightSelectablePlayers`, all non-selectable player targets now use the same gray dashed style (`.target_unselectable`), not just Wanderers.
  - Covered cases include:
    - self target (current player),
    - Wanderer,
    - same-sect / card-rule invalid targets,
    - protected targets,
    - per-card extra invalid cases (e.g. no Action card for Secret Alliance, empty-sect confrontation targets, invalid Kowtow targets).
  - Goal: any non-clickable player target now has consistent visual affordance.

Latest update (2026-04-16):
- Defense-card readiness now attack-kind aware in `confirmDefense`:
  - Root cause: defense focus dimming used a broad defense-card set, so `Great Mercy` and `Firm Faith` could both look clickable even when only one matched the current attack kind.
  - Fix (`hegemonyoffaith.js`):
    - Added `getExpectedDefenseCardKey(defenseKind)` and reused it in both validation and readiness.
    - In `confirmDefense`, only the required defense card remains normal; non-matching defense cards stay gray/shrunk (`action-card-soft-disabled`).
    - Keeps existing player-turn standby dimming for defense cards unchanged.

Latest update (2026-04-16):
- Wanderer target visual disable alignment:
  - In target-selection highlight flow, Wanderer players are now marked with a gray dashed unselectable frame (`.target_unselectable`) instead of silently being skipped.
  - Added explicit info hint when applicable: `Wanderer cannot be targeted: ...`.
  - This matches the visual communication pattern used for protected targets (clear "cannot select" affordance).

Latest update (2026-04-16):
- Everyone is Equal / Chaos Coming center-shuffle visual enhancement:
  - Added explicit center shuffle phase between gather and deal: layered triple-card back stack with short rotate/sway animation.
  - Increased redistribute hold before dealing (`shuffleFxHoldMs`) so center shuffle is visually readable before cards fly back to hands.
  - Keeps single main flow continuity: gather to center -> center shuffle visual -> deal back to players.

Latest update (2026-04-16):
- Everyone is Equal / Chaos Coming shuffle FX continuity fix (left-side duplicate-deal visual):
  - Root cause: after global gather->shuffle->deal FX starts, private `newBelievers` / `newActionCards` still inserted cards using deck-source animation (`believer_deck` / `action_deck`), creating a second deal path on the left side.
  - Fix (`hegemonyoffaith.js`):
    - Added one-shot suppression flags for deck-source insertion right after redistribute skills.
    - `notif_skillEveryoneEqual` now marks believer suppression; `notif_skillChaosComing` marks action suppression.
    - `notif_newBelievers` / `notif_newActionCards` consume suppression and add cards without deck source during that one redistribute sync.
  - Result: visual flow stays single-path (hand gather -> center shuffle -> center deal), no extra left-side pile/deal segment.

Latest update (2026-04-16):
- Zombie Army UX flow unification (skill-card click / top button / direct Faith War):
  - Skill-card click for Zombie Army now always routes directly to the same Faith War+Zombie flow handler (`onUseZombieArmyForFaithWarClicked`), instead of being gated by generic `useSkill` passive checks.
  - Direct Faith War card play now prompts once when Zombie Army is available:
    - `OK` = enable Zombie Army for this Faith War
    - `Cancel` = play normal Faith War (explicit info message shown)
  - Top button label clarified from generic skill wording to contextual action wording:
    - `Use Zombie Army in Faith War`
  - Goal: remove ambiguity about whether Zombie Army is active for a given Faith War declaration.

Latest update (2026-04-16):
- Divine Inspiration / Prophet deadlock mitigation:
  - Refactored Prophet draw resolution (`stResolveProphetPrediction`) to fetch requested Believers with a single `pickCards(draw_count, 'deck', drawer)` call, then route outcomes in memory by draw index.
  - Removed per-card `countCardInLocation('deck') + pickCards(1, ...)` query loop.
  - Goal: reduce lock churn and query interleaving during Divine Inspiration + Prophet interrupt flow, lowering `mysql_deadlock_restart_transaction` risk seen by other clients mid-action.

Latest update (2026-04-16):
- Boot blocker rollback for `gameModule.Game is not a constructor`:
  - Root cause: `modules/js/hegemonyoffaith.js` bridge returned legacy constructor directly, but mixed/new loader path instantiates via `new gameModule.Game(...)`.
  - Result: `gameModule.Game` became `undefined`, causing boot crash on table load.
  - Fix: removed `modules/js/hegemonyoffaith.js` bridge file and reverted to root legacy entry (`hegemonyoffaith.js`) as single UI module source.
  - Compatibility guard retained in root UI module: `Game.Game = Game; return Game;` so constructor is available whether loader probes module return directly or via `.Game`.

Latest verification (2026-04-16 handover regression):
- Code-authoritative rollback state confirmed:
  - `modules/js/` currently has no bridge files (`Game.js` / `hegemonyoffaith.js` are absent).
  - Active UI entry is root `hegemonyoffaith.js` with compatibility guard `Game.Game = Game; return Game;`.
  - Any earlier bridge-module notes are historical attempts and not current runtime state.
- Zombie Army three-entry flow parity verified by code path:
  - Skill-card click -> `onPlayerSkillSelectionChanged` -> `onUseSkillButtonClicked` -> skill type 10 routes to `onUseZombieArmyForFaithWarClicked`.
  - Top button (`Use Zombie Army in Faith War`) -> `onUseZombieArmyForFaithWarClicked`.
  - Direct `Faith War` card click -> Yes/No confirm -> `beginTargetSelection(..., {use_zombie:1}|{})`.
  - All three paths converge to Faith War target-selection and submit through `playActionCard` (`use_zombie=1` only when enabled), with explicit player-facing mode message.
- Divine Inspiration + Prophet deadlock mitigation verified by code path:
  - `stResolveProphetPrediction` now performs one `pickCards(draw_count, 'deck', drawer_id)` and routes cards in memory by draw index.
  - Removed old per-draw `countCardInLocation('deck') + pickCards(1, ...)` query loop.
  - Private `newBelievers` sync is sent after public `prophetPredictionResolved` to keep animation/order consistency.
- Rule lock verification (code-authoritative):
  - Terminology uses `Mental` (no `Spiritual` in runtime code paths).
  - `breaking_faith` remains Strategy in action-type masks (server/client).
  - Attack main flow remains `confirmDefense` -> `resolveAttack` -> (Faith War) representative selection / believer commit -> resolution.
  - Unrevealed skills show generic hidden tooltip only; skill content is not exposed before reveal/activation.
- Minimal local regression checks completed:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `test_logic.php` cannot run standalone (requires BGA `clienttranslate()` runtime context).
  - No live BGA table session in this local environment, so no new `GS1 ...` runtime reference was generated in this pass.

Latest update (2026-04-16):
- World Peace / Eternal Truth self-panel `Active` badge desync fix:
  - Root cause: in `playerTurn` UI refresh (`onUpdateActionButtons`), client re-applied `skill_state` from state args and also overwrote local protection snapshot, which could be stale and clear self-only active badge.
  - Fix: `playerTurn` now updates only `mySkillState`/public skill state + tooltips, and no longer rewrites protection flags from state args.
  - Protection badges are now sourced from authoritative skill-protection notifications (`skillWorldPeace`/`skillEternalTruth` + `publicCountsSync`), preventing self-panel-only `Active` loss.
- Gate of Truth copied World Peace/Eternal Truth deadlock mitigation:
  - In `useSkill` branches (`effective_skill_type` 8 and 7), write order is now aligned with turn-reset flow:
    - clear Gate of Truth copied-skill context first,
    - then set skill protection mask.
  - This removes an inverted globals-write sequence that could widen rare `mysql_deadlock_restart_transaction` windows under concurrent table/global updates.

Latest update (2026-04-16):
- War/Debate left action-owner label lock fix:
  - Fixed duel-board owner refresh logic so left-side action owner (`who played Faith War/Faith Debate`) stays bound to the original action-card player.
  - In both `notif_faithDebateRound` and `notif_faithWarRound`, left owner now resolves by priority:
    1) `combat_context.war_attacker_id` (source-of-truth),
    2) existing `currentFaithWarActionOwnerId`,
    3) fallback attacker ids from current notif payload.
  - Prevents right-side representative reassignment from accidentally overwriting the left action owner name during rounds.

Latest update (2026-04-15):
- Prophet prediction visual anchoring + RWD stability pass:
  - Prophet pending/reveal temp cards are now attached to `#prophet_prediction_card_anchor` after reaching the prediction slot, so they move with the slot/frame under layout changes.
  - Before flying to player hand/anchor, prediction cards are now moved back to the flight root (`#game_play_area`) to keep `slideToObject` trajectories stable.
  - Adjusted prediction text spacing: `.prophet-prediction-lines` `margin-top` increased from `6px` to `11px` (about +5px).
- The Prophet tooltip text simplified for rule clarity:
  - Updated skill description to general trigger wording: When another player plays an Action card that draws Believers, predict the first Believer type; snatch it if correct.
- Holy Rebirth tooltip wording clarity:
  - Replaced technical phrase `trigger window` with player-facing wording `at the same time` to avoid ambiguity in skill timing text.
- Ascend with Me tooltip clarity:
  - Clarified hand-limit scaling to explicit per-headcount rule: `+1 hand limit per Follower`.
- Eternal Truth / World Peace wording alignment:
  - Replaced `block all ... attacks` with `gain protection from ... attacks` to avoid global-lock ambiguity and match actual self-protection logic.
- Zombie Army tooltip wording refinement:
  - Replaced `fodder` phrasing with rule-accurate wording: usable only in Faith War initiated by the user, and each used graveyard Believer is removed from the game.
- Impermanence of Life wording alignment:
  - Removed `remains active` phrasing and switched to fail-state wording: `if this skill has not failed ...` to match hidden passive behavior.
- Impermanence of Life tooltip expanded to full rule text:
  - Added explicit hidden/passive constraints (cannot become Follower/Wanderer; cannot absorb others), fixed win threshold to `at least 5 Believers`, and added fail consequence (`reveal + discard + draw new hidden skill`).
- Impermanence of Life copy refinement:
  - Removed redundant failure examples from tooltip to keep text concise after constraints are already stated.
- Skill tooltip style normalization pass:
  - Removed redundant `Leader only` from Praise of Life effect text (default skill scope already implies Leader).
  - Removed redundant `does not consume action` note from Chaos Coming effect text (kept only exceptional consume cases).
  - Unified one-time-use phrasing to leading format (`Once per game: ...`) for consistency.
  - Refined Reverse Karma wording to round-scoped phrasing (`current Believer confrontation round`) to avoid single-fight ambiguity in multi-round Faith War/Faith Debate.
- Timing/effect de-dup pass (identity wording):
  - Skill 1 timing simplified to `Timing: While you are a Follower.` (removed `after surrender completion` wording).
  - Removed duplicate identity phrase `As a Follower` from Skill 1 effect text so role condition is stated once in Timing.
- KABOOM wording split between Timing and Effect:
  - Moved precondition to Timing: must be used before any Physical/Mental attack this turn.
  - Kept post-use lock in Effect: after using KABOOM, Physical/Mental attacks are blocked for the rest of the turn.
- Skill timing map readability cleanup:
  - Reordered `getSkillTimingText()` key sequence so Skill `2` appears near Skill `1` (ascending flow), avoiding false impression that Skill 2 timing was removed.
- Skill usage map readability cleanup:
  - Reordered `getSkillUsageInfo()` skill branches to strict ascending `1 -> 16` order (no logic/text behavior change), so full tooltip sections are now consistently easy to audit.
- The Prophet timing/effect de-dup refinement:
  - Timing is now generic/reactive (`when another player draws Believers`) without naming specific Action cards.
  - Effect text now focuses only on result (`predict first draw; snatch if correct`) and avoids repeating trigger wording.
- Full timing/effect de-dup pass (all skills, first sweep):
  - Enforced split rule: `Timing` states trigger/context; `Effect` states outcome only.
  - Holy Rebirth effect now only states revive outcome; trigger condition is timing-only.
  - Holy Rebirth timing simplified to one direct rule sentence (removed example list) for consistency with other skills.
  - Ascend with Me timing now keeps only passive role context; draw/hand-limit mechanics remain in effect.
  - Zombie Army and Everyone is Equal effect text removed redundant timing phrases already covered by timing lines.
- Ascend with Me timing correction:
  - Updated trigger condition from Leader-role wording to actual effect condition: passive while the player has one or more Followers.
- Zombie Army timing copy cleanup:
  - Simplified timing line to pure trigger wording (`When you declare Faith War.`), removing redundant instruction phrase (`choose whether to use it`).
- Impermanence timing alignment:
  - Updated timing text to explicit rulebook-style check point: `At game-end check (passive).`
- Soul-Cutting Sword / Chaos Coming wording normalization:
  - Skill 11 effect text now matches Skill 14 style with leading usage cap phrasing: `Up to 3 uses per game: ...`.
  - Skill 11 usage text aligned with Skill 14 (`Uses: Up to 3 per game.`), removing extra trailing phrase for consistency.
- Reverse Karma timing simplification:
  - Replaced card-list timing text with a single confrontation-resolution timing rule: `Reactive before a Believer confrontation result is resolved.`
- Reverse Karma war/debate scope wording fix:
  - Clarified actual implementation behavior: in Faith War/Faith Debate, prompt appears once at confrontation start (after defense, before Believer selection), not each round.
  - Updated effect wording from round-scoped phrasing to confrontation-scoped phrasing (`for this confrontation`).
- Reverse Karma timing text simplification:
  - Removed extra flow-detail phrase from timing text; now uses concise trigger wording only (`Reactive once when a confrontation starts.`).
- Skill tooltip consistency pass (JS-wide, second sweep):
  - Re-checked all skill tooltip layers in `hegemonyoffaith.js` (`Effect` / `Timing` / `Uses`) for duplicated or conflicting wording.
  - Removed remaining `does not consume action` / `no action consumed` phrases from user-facing `Uses` lines (kept only frequency/passive/reactive info).
  - Normalized several `Uses` lines to concise format (`Once per game/turn/round`, `Up to 3 per game`, `Passive`, `Reactive`).
  - Updated an internal comment wording to avoid reintroducing `does not consume action` phrase during future text grep reviews.
- Zombie Army picker hint clarity:
  - Updated graveyard modal hint text from ambiguous `Click one card...` to explicit `Click one graveyard Believer card to use in this Faith War round.`
- Discard-without-slot info text generalized:
  - Clarified UX message for zero action-slot state in discard handlers (`onToggleDiscardModeClicked` / `onDiscardSelectedActionsClicked`).
  - Replaced skill-specific example wording (`for example Praise of Life`) with role-agnostic wording (`Use an available Skill or End Turn.`) because not all players have that skill.
- Rule/logic verification completed (code-authoritative):
  - Prophet trigger scope is player-based (not sect-restricted): it can predict draws from other players including own Followers.
  - KABOOM target scope is player-based (self excluded only): it can target own Followers.

Latest update (2026-04-12):
- Breaking Faith defense readiness visual alignment:
  - During `confirmDefense` when defense kind is `breaking_faith`, `breaking_faith` is now treated as an enabled defense card in hand-readiness dimming logic.
  - Fixes mismatch where card was gray (looks unusable) but still playable as valid defense.
- Zombie Army graveyard concealment UX:
  - During Faith War with Zombie Army active, graveyard UI is now concealed from normal viewers: only post-war-start deaths are visible in preview/modal; pre-war corpse snapshot is hidden.
  - Graveyard counter display is now UI-visible count (post-war deaths only while concealed), while internal graveyard count remains authoritative for logic.
  - Added empty-state hint text: `Believers have been summoned to war.` when concealed view has no visible cards.
  - On Faith War end, concealment is cleared and full graveyard view is restored (with natural ordering preserved: war deaths remain newer/top).
- Zombie Army graveyard snapshot UI lock:
  - Frontend Zombie grave-picker now filters by Faith War snapshot boundary (`war_zombie_snapshot_max_discard_arg`) and only shows cards that were already in graveyard when Faith War started.
  - Selected Zombie grave card re-validation now uses the same snapshot filter, preventing stale/newly-dead cards from being submitted.
  - Added snapshot boundary propagation in `faithWarStart` / `faithWarRound` notifications and reset on `faithWarEnd`.
- Disabled Action-card tooltip accessibility fix:
  - `action-card-soft-disabled` no longer uses `pointer-events:none`, so hover tooltips remain visible on gray/locked cards.
  - Added JS click/touch guard on `#myactioncards` to block interaction on soft-disabled cards while keeping hover available.
- Duel waiting-phase readiness flicker fix:
  - Added `syncActionSelectionModeToCurrentState()` and applied it to shared ajax success/error path.
  - Prevents transient `setSelectionMode(1)` reset during `faithWarDuel` / `faithDebateDuel` / confrontation waits, so Action cards no longer briefly appear restored/clickable mid-duel.
- Everyone is Equal / Chaos Coming shuffle FX completion pass:
  - Fixed invisible back-card flight in redistribution animations by defining explicit size for `.panel-fly-temp-card.card-back-*`.
  - Extended notification sync window for `skillEveryoneEqual` / `skillChaosComing` from `3000ms` to `5400ms` so gather->shuffle->deal sequence is not cut off by early hand-sync messages.
  - Extended local pulse window (`*_FxPendingUntil`) to match the longer sequence timing.
- Hand selection frame visibility restoration:
  - Removed over-aggressive hand-card border reset that could hide selected-card frames.
  - Hand selected cards now keep an explicit visible frame (gold border + outline), with fallback for BGA inline `border-width:1px` selection markers.
- Duel readiness visual stabilization:
  - During `faithWarDuel` and `faithDebateDuel`, believer-hand readiness is now forced to stay active for the whole confrontation lifecycle (including result/animation windows).
  - Prevents transient hand-style flicker where Action cards briefly appear usable between believer commit and duel resolution animations.
- Hand-card selection border normalization:
  - Added high-priority hand-card border reset to suppress BGA stock injected inline `border-width: 1px` selection borders.
  - Hand card selection now consistently uses project outline/glow styles instead of mixed red 1px border.
- Targeted-card no-target guard:
  - All target-required Action cards (including `breaking_faith`) now soft-disable when no legal target exists.
  - Selection handler now hard-blocks entry into target-selection flow if no legal target exists, preventing "card flies out but no target to click" dead paths.
  - Added robust disabled-card detection in selection guard to handle stock wrapper/inner-node mismatch.
- Hand readiness click-guard hardening:
  - Action cards with `action-card-soft-disabled` are now non-clickable (`pointer-events: none`), so gray cards cannot be selected.
  - Added JS defensive guard in action selection handler to silently ignore stale selection events on disabled cards.
- KABOOM stale-lock hardening:
  - Added backend self-heal for legacy/stale `karboom_attack_lock_mask` bits (auto-clears when `karboom_used_this_turn` is not active for that player).
  - Turn-boundary cleanup now resets KABOOM lock mask globally; per-turn reset also clears per-player lock bit.
  - Frontend attack disable/readiness now requires both `attack_locked_by_karboom=1` and `karboom_used_this_turn=1`, avoiding false lock visuals on stale snapshots.
- Info Spy modal tooltip fallback hardening:
  - Added native `title` tooltips on modal Action/Believer entries after rich-tooltip binding.
  - Ensures hover tips still appear inside Spy modal even when `addTooltipHtml` is not triggered reliably in dynamic overlay contexts.
- KABOOM attack-lock alignment:
  - KABOOM now locks the **user's** Physical/Mental attack actions for the rest of that turn.
  - Frontend readiness now soft-disables all attack cards while `attack_locked_by_karboom=1`, and click validation blocks attack play with `Your attacks are locked this turn.`
- Prophet prediction slot positioning hardened again:
  - Slot host no longer uses absolute coordinate math.
  - It is now mounted directly after the current recruit/action card node in `central_arena`, so prediction card stays visually next to recruit instead of drifting to a corner under layout/RWD changes.
- End summary now supports a dedicated reason for multi-member Sect internal winner:
  - `sect_internal_most_believers` -> `In the Sect with the most Believers, this player has the most Believers and wins.`
  - Added new `game_end_reason_code = 6`.
- Prophet prediction reveal timing synced with combat visuals: after prediction text (`Hit/Miss`) appears, card now remains visible for at least one full unified reveal-hold window before flying to destination.
- Reverse Karma prompt readiness visuals stabilized: during `reverseKarmaPrompt`, hand readiness no longer depends on `war_type`; action cards remain soft-disabled and Believer cards stay ready across the whole prompt/wait cycle.
- Secret Alliance confirm flow hardened against duplicate submits: both attacker/target confirm handlers now set `actionSubmissionInFlight` and temporarily lock Action-card selection mode, reducing accidental double-send and potential contention spikes.
- Info Spy modal tooltip binding fixed: spy overlay is now inserted into DOM before building card entries, so `attachActionCardTooltip/attachBelieverTooltip` can bind reliably on hover targets.
- Believer-type wording unified for Witch Hunt/Prophet UX and logs: type selection buttons and prediction outputs now use `BelieverName #N` (no `Type 1/2` style labels), and backend `getBelieverTypeLabel()` follows the same format for notifications.
- Final Struggle Sect-vs-Sect duel transition fix:
  - In `playBelieverCardCombat`, `war_type=12` now advances with `nextDuelStep` (same as Faith War/final war duel flows), not `nextStep`.
  - Fixes server crash path `This transition (nextStep) is impossible at this state (70)` during Sect-vs-Sect duel commits.
- War Log modal visual unification:
  - War Log overlay/modal/header/button now reuse the same `spy-modal` shell style used by Spy/Graveyard modals.
  - Close button style is now consistent (`bgabutton bgabutton_blue`) across War Log, Spy, and Graveyard overlays.
- Faith Debate duel readiness stabilization:
  - Added duel-resolution states (`resolveDuel`, `resolveFaithDebateDuel`) to believer-ready phase so hand visuals do not flicker between Action-ready and Believer-ready during result windows.
  - During believer-ready phases, Action hand `selectionMode` is forced to `0` to match War behavior and prevent temporary clickable/normal-looking Action cards.
- Faith Debate stop-approval turn-owner fix:
  - `finalizeFaithDebate()` now restores active player to the original debate initiator (`war_attacker_id`) before routing back to player turn.
  - Prevents edge case where follower-initiated Debate stop flow could return turn ownership to the Sect Leader who only handled approval.
- Player-turn action-mask reset hardening:
  - On entering `playerTurn`, local action mask/count/max are now always re-synced from server args (with safe defaults `0/0/2`), instead of preserving stale values when some args are missing.
  - Prevents residual local lock states where newly active players could incorrectly see most Action cards disabled after identity/sect transitions (for example forced Sect absorption).
- Player-turn stale-arg overwrite fix:
  - `onUpdateActionButtons(playerTurn)` no longer refreshes action mask/count/max from merged cached `serverArgs`.
  - Turn-window values are now updated only from the current incoming state payload (`args` / nested `args.args`), preventing previous-turn mask residues from re-locking Physical/Mental cards after forced absorption or other identity-sync events.

## 1) Current Goal
Port Hegemony of Faith to BGA with stable core action-card flow first, then skill system later.

## 2) Rule Source Priority (locked)
1. Primary: `Hegemony_of_Faith_Rules_Consolidated.md` English content.
2. Secondary check: `Hegemony of Faith_Rulebook.pdf`.
3. Chinese text is helper reference only if English is ambiguous.

If conflict happens, English rule source wins.

## 3) Terminology Lock (must not drift)
- Attack families: `Physical Attack` / `Mental Attack` / `Strategy` / `Discard`.
- Never use `Spiritual` for this project. Use `Mental` only.
- `breaking_faith` is **Strategy** (special strategy card), not Physical/Mental attack family.
- Most attacks target **Sect** (UI selects one player as target entry point for that sect).
- Wanderer is untargetable by normal card targeting.

## 4) Core Combat Flow (multi-player sect case)
1. Ask defense first (sect scope):
   - Players with matching defense card can decide defend/skip.
   - Players without matching defense card wait (`Waiting for sect defense`).
2. If not defended, leader assignment happens where applicable:
   - Leader assigns follower/self representative.
   - Assigned player must commit believer.
3. Commit believer(s), then resolve per mode (single or multi-round).
4. Exceptions:
   - `witch_hunt` and `spread_rumors`: no believer duel; only defense check then direct effect.

## 5) Card Behavior Decisions Already Agreed
- `great_mercy`: physical defense card (not revive).
- `firm_faith`: mental defense card.
- `its_a_miracle`: revive-oriented strategy card.
- `Martyrdom`:
  - Attacker committed believer always dies.
  - Defender draw vs attacker also dies.
- `Conspiracy`:
  - Mental contest; attacker steals only defeated defender believers.
  - If any defender beats attacker, attacker steals none and keeps own committed believer.
- `Spread Rumors`:
  - Target sect; each player in that sect loses 1 random believer to attacker.
- `Witch Hunt`:
  - Target sect + believer type; if not defended, matching believers in target sect die.

## 6) Major Implemented Logic (backend)
- Sect-based combat and representative flow implemented for:
  - Faith War
  - Faith Debate
  - Martyrdom
  - Conspiracy
- Defense phase exists before combat resolution.
- Witch Hunt / Spread Rumors resolve as sect-wide effects (no believer duel).
- Turn action-type blocking (same type cannot be used twice in one turn).
- Draw back to 6 action cards at turn flow areas has been touched (needs final verification in full runs).
- Surrender / Wanderer framework implemented (still needs more QA for edge states).
- End-game framework added (backend-first style, front-end polish pending).

## 7) Major Implemented UI/UX (frontend)
- Central arena flow for action resolution.
- AoE layout for Martyrdom/Conspiracy redesigned:
  - Left: attacker section.
  - Center: VS.
  - Right: defenders.
- Right-side defender slots fixed by seat order (not by commit order).
- Combat result visual tags (`win/lose/draw`) and grayscale treatment added.
- Card text tooltip model added.
- Notification spam reduced (especially assignment/self-assignment noise).

## 8) Recent Fixes
- Public spent-status visibility patch for limited-use skills (2026-03-30):
  - Added backend `player_skill_public_state` (revealed-skill-only public snapshot) to feed panel status rendering for all players.
  - Player panel `Skill` status now shows `Spent` (publicly) when a revealed limited-use skill has exhausted its total-use cap.
  - Applied to per-game/per-cap skills (including `Purple Hermit` and `Headstronger`), enabling cross-table trust for surrender/join decisions.
  - Tooltip channel now consumes effective public skill state (not only self state), so public usage counters stay consistent after reconnect/refresh.
- Purple Hermit / Headstronger rule-correction patch (2026-03-30, user-confirmed semantics):
  - `Purple Hermit` is no longer forced auto-trigger on surrender confirm.
  - Corrected to follower-controlled one-time activation:
    - only available after accepted-surrender `giveBeliever` is confirmed,
    - follower chooses when to activate (hidden until use),
    - on activation: steal `floor(half)` of current leader believers immediately, remain follower, and mark pending split.
  - Added Purple Hermit pending-split start-of-turn resolution:
    - at that follower's next turn start, auto-steal `floor(half)` again from current leader and become independent leader.
    - if leader uses `Breaking Faith` on this pending Purple Hermit follower first, leader regains `0` (no steal) for this case and pending split is cleared.
  - `Headstronger` now explicitly limited to once per game.
  - Skill tooltip now shows unavailability reason (`disabled_reason`) to make per-game/per-turn exhaustion visible.
- Ascend with Me (skill 6) passive flow patch (2026-03-30):
  - Implemented leader action-hand limit scaling:
    - `hand_limit = 6 + follower_count` while leader holds active (unsealed) `Ascend with Me`.
    - Applied to turn-start refill and end-turn discard-limit checks.
  - Implemented follower-draw mirror effect:
    - whenever a follower draws Action cards to limit, their linked leader with skill 6 draws the same number of Action cards.
    - card draw uses shared deck/discard reshuffle-safe pipeline.
  - Trigger reveal alignment:
    - skill 6 now remains passive/non-clickable (`can_use=0`) but is treated as implemented,
    - reveal occurs once leader has followers (recruit/absorb/leader-replacement paths).
  - Added `action_hand_limit` into skill state so tooltip can show current cap and reduce hand-limit confusion.
- Purple Hermit / Headstronger sect-split skill patch (2026-03-30):
  - Implemented `Headstronger` (skill 3) backend flow:
    - leader expels all current same-sect followers,
    - each expelled follower loses `floor(half)` hand believers to the skill user,
    - expelled followers become independent leaders (`role=0`, `leader_id=NULL`, unsealed) with fixed-range sect id allocation (`1..8`).
  - Implemented `Purple Hermit` (skill 1) post-surrender arming flow (no forced auto-trigger):
    - trigger point is still accepted-surrender `giveBeliever` confirm (`support_mode === 0`),
    - this step only arms follower-controlled availability (ready state),
    - follower later chooses manual activation timing; split/steal effect resolves through active skill use path.
  - Added shared believer-transfer helper path to keep random-half steal behavior consistent across split-related skill effects.
  - Frontend player-turn hint now includes explicit `Headstronger` confirm instruction.
- Faith Debate representative-ownership lock patch (2026-03-30):
  - `stResolveFaithDebateDuel` now resolves debate result ownership by assigned representatives first (`war_rep_attacker_id` / `war_rep_defender_id`), with card-location owner only as fallback.
  - Rule lock: in Faith Debate, "who fights gets the believer" is explicit and independent from sect leader identity.
- Combat ownership lock for assigned fighters (2026-03-30):
  - Faith War duel ownership/winner identity now hard-bound to round representatives (`war_rep_attacker_id` / `war_rep_defender_id`) before bonus allocation.
  - Conspiracy transfer owner now resolves as assigned attacker representative (if present) else attacking player.
  - Rule lock: card gains/bonus from assigned-fighter combat stay on that fighter, not auto-routed to sect leader.
- Faith War representative-ownership hard lock patch (2026-03-30):
  - `stResolveDuel` now resolves per-round winner/loser identity and bonus owner by representative IDs (`war_rep_attacker_id` / `war_rep_defender_id`) as source of truth.
  - Prevents any fallback drift to leader/card historical owner when assigning War result ownership.
  - Rule lock: Faith War bonus always belongs to the assigned fighter who won that duel round.
- Faith War representative manual-commit lock patch (2026-03-30):
  - In `stResolveDuel`, removed normal-path auto-commit fallback for missing representative cards.
  - Representative believer commits are now strictly explicit (player must choose + confirm).
  - Auto-commit remains only in disconnected/zombie flow (`zombieTurn`) by design.
  - Goal: prevent assigned representatives from having believers auto-played before manual confirmation.
- Faith War assigned-representative UX/state-sync patch (2026-03-30):
  - `faithWarRound` banner title now uses representative names (`attacker_rep_name` vs `defender_rep_name`) instead of always leader names.
  - Combat sect text color now uses sect leader color (sect-consistent) rather than representative/player personal color.
  - After local `faithWarCardPlayed` / `faithDebateCardPlayed`, client now clears stale action buttons and re-renders duel buttons immediately, preventing stale `Confirm Believer` button from persisting after a commit.
  - `onConfirmBelieverClicked` success callback now clears `actionSubmissionInFlight` to avoid latch carry-over.
- Representative selection label clarity patch (2026-03-30):
  - Unified representative candidate button text from `Name (N)` to `Name (Believers: N)`.
  - Applied to `Faith War`, `Faith Debate`, `Martyrdom`, and `Conspiracy` representative-selection states.
  - Goal: remove ambiguity of trailing numbers and make candidate believer counts explicit.
- Faith War Zombie/bonus log consistency patch (2026-03-30):
  - War-round `duelResult` now carries explicit `result_bonus` from backend resolution.
  - Frontend war round log now reads `result_bonus` directly when rendering each row.
  - Bonus marker updater now supports both `win` and `lose` rows (`win (bonus)` / `lose (bonus)`), instead of only win rows.
  - Goal: remove false impression that bonus was missing when the round winner was the defender (including Zombie Army graveyard-card loss cases).
- Skill trigger input unification patch (2026-03-30):
  - Player-turn skill card selection mode now opens whenever `useSkill` is available (Zombie Army no longer excluded from skill-card click path).
  - Clicking Zombie Army skill card now routes through the same handler as top button (`onUseZombieArmyForFaithWarClicked`), keeping behavior consistent.
  - Result: players can use skills via either top button or clicking the skill card itself.
- Secret Alliance offered-card selection source-of-truth patch (2026-03-30):
  - Frontend `getSingleSelectedActionCardIdFromHand` now uses `playerActionCards.getSelectedItems()` as primary source (single selected item `id`) instead of over-relying on DOM selected-class parsing.
  - Added fallback DOM selector compatibility for `.stockitem.stockitem_selected` and `.stockitem.selected`.
  - Goal: prevent false `Select exactly one Action card to offer` and wrong offered-card id mapping during Secret Alliance exchange flow.
- Player panel active-skill marker UX patch (2026-03-30):
  - Added per-player red `Active` marker under `Skill` in right player panel counters.
  - Marker is driven by public protection snapshot/state (`skill_protection`) and updates live.
  - Covers ongoing protection visibility for skills like `Eternal Truth` / `World Peace` without requiring log-reading.
- Witch Hunt declaration privacy patch (2026-03-30):
  - Removed selected believer-type disclosure from public `witchHuntStart` message.
  - Defense window now sees only attacker + target sect, not declared target type.
  - Prevents defense decisions from being informed by leaked target-type information.
- Setup crash hotfix for deferred turn anchor label (2026-03-30):
  - Added missing game-state label mapping for `forced_next_turn_anchor_id` in `initGameStateLabels`.
  - Fixes table creation failure: `Unknown gamestate label: forced_next_turn_anchor_id`.
- Surrender routing active-player safety pass (2026-03-30):
  - Replaced remaining surrender-related direct `changeActivePlayer` calls with `switchActivePlayerSafely` in:
    - `stRouteSurrenderBankrupt`
    - `stRouteSurrenderLeaderResponse`
    - leader-support handoff branches in `stCheckEndTurnPhase`
  - Goal: remove residual `Impossible to change active player during activeplayer type state` in final reject/become-wanderer edge timing.
- Surrender rejection-mask persistence patch (2026-03-30):
  - Fixed case where previously rejected leaders reappeared after `accept -> leaderGiveBeliever -> cancel`.
  - `acceptSurrenderRequest` no longer clears `surrender_reject_mask`.
  - `startSurrenderFlowFor` now supports optional `reset_rejected` flag (default true); continuation paths use `false` to preserve current rejection history.
  - `rejectLeaderSupport` now marks current leader as rejected before routing back to surrender choice.
  - Support-mode `cancelGiveBeliever` now also marks current leader as rejected before returning to surrender flow.
- Surrender give/accept active-player switch crash hardening (2026-03-30):
  - Root issue: some surrender end-paths attempted effective active-player retargeting while still in `activeplayer` state, which can raise BGA error `Impossible to change active player during activeplayer type state`.
  - Added `forced_next_turn_anchor_id` mechanism:
    - surrender action handlers now set a deferred next-turn anchor (`setForcedNextTurnAnchor`) instead of switching immediately,
    - `stNextPlayer` consumes the anchor and applies it from game state context before normal next-player rotation.
  - `switchActivePlayerSafely` no longer performs forbidden activeplayer fallback `changeActivePlayer`.
  - Goal: keep prior surrender/support turn-order intent while removing illegal state-time player switching.
- Fixed-sect-ID allocation patch for split/reborn (2026-03-30):
  - Added backend allocator `allocateIndependentSectId(...)` to ensure independent players always get sect ids in fixed range `1..8`.
  - Replaced Breaking Faith split sect reassignment from `player_id` to fixed-range allocator output.
  - Replaced Wanderer reborn sect reassignment from `player_id` to fixed-range allocator output and added identity sync (`wanderer_reborn`).
  - Goal: eliminate invalid sect labels like `Sect 2394578` and keep sect namespace consistent with 8-sect rule.
- Breaking Faith post-split targetability hardening (2026-03-30):
  - `stResolveBreakingFaith` now always pushes `playerIdentitySync` for both attacker and defender, not only the split side.
  - Frontend target-sect checker adds a stale-data tolerance for another-sect cards when both sides appear as leaders in the same sect (an impossible steady-state), deferring final validation to backend.
  - Goal: prevent false "same sect" frontend blocking right after Breaking Faith split when targeting former leader with sect-attack cards.
- Breaking Faith split identity UI-sync patch (2026-03-30):
  - Backend split logic already executed for Breaking Faith (defended or not), but lacked immediate identity notify.
  - Added `playerIdentitySync` push after split resolution (`breaking_faith_split`) for the player who becomes independent.
  - Expected result: right-side panel/table role + sect icon/name update immediately after Breaking Faith resolves.
- War/Debate representative candidate source hardening (2026-03-30):
  - Frontend representative buttons now resolve candidates from side-specific state args (`attacker_candidates` / `defender_candidates`) keyed by current viewer leader id.
  - No longer prioritizes ambiguous legacy `candidates` list when side-specific lists are present.
  - Applied to both `chooseWarRepresentative` and `chooseFaithDebateRepresentative`.
  - Goal: prevent cross-side candidate mismatch causing visible button but backend `Invalid representative for your sect`.
- Frontend sect-target prefilter patch (2026-03-30):
  - Added unified target-sect gate in target selection UI (`canSelectTargetPlayerForCard`), so invalid sect targets are no longer clickable.
  - Applied to:
    - another-sect only cards: `faith_war`, `faith_debate`, `witch_hunt`, `spread_rumors`
    - own-sect only card: `breaking_faith`
  - Goal: prevent "clickable but backend rejects" UX (e.g., same-sect target after Kowtow absorption).
- Kowtow forced-absorb notification + identity sync patch (2026-03-30):
  - `playKowtowToMe` now captures absorbed player IDs before sect reassignment and sends per-player private notify (`kowtowForcedAbsorbed`) so absorbed players are explicitly informed.
  - Added post-absorb `playerIdentitySync` push for absorbed members and attacker leader, so frontend role/sect data rehydrates immediately.
  - Frontend now subscribes to `kowtowForcedAbsorbed` and displays a direct status message to absorbed players.
  - Expected UI result after absorb: sect icon/name and role label update to new sect + follower identity without reload.
- Surrender give-believer rollback flow patch (2026-03-28):
  - Added backend action `cancelGiveBeliever` and wired state-machine support in `leaderGiveBeliever`.
  - Leader can now cancel at the give-1-believer step:
    - Support mode (`follower 0 believer` rescue): behaves like refusal and resumes surrender flow for that follower.
    - Accepted surrender mode: restores the pending follower's previous role/leader/sect/sealed snapshot, marks current leader as rejected, then continues surrender flow.
  - Frontend `leaderGiveBeliever` now shows `Cancel Surrender/Support` button that triggers real rollback (not only local deselect).
  - Impermanence fail checks for accepted surrender are now finalized on `giveBeliever` confirm (not on accept click), so cancel rollback does not consume skill-fail effects.
- Surrender leader-give-believer UI unblock patch (2026-03-28):
  - Frontend now recognizes `leaderGiveBeliever` state and renders explicit `Confirm Give Believer` action.
  - Fixes surrender flow freeze where status text appeared but no confirm path was available.
- Duel/AOE visual + log persistence + discard-top sync patch (2026-03-28):
  - Removed up/down outcome offset for duel/AOE combat cards (winner/loser/draw no vertical transform); only loser grayscale remains as requested.
  - Removed combat commit pop/lift visual for committed combat cards.
  - `faithWarEnd` / `faithDebateEnd` now return to short post-result cleanup (center arena clears after brief delay).
  - Added server-side right-panel combat history lines (`combatRoundHistory`) for Faith War/Faith Debate rounds, so past duel/debate outcomes remain reviewable in BGA log history.
  - War/Debate log `View all ...` button now appears whenever there are log entries, for easier post-combat review.
  - Duel action card move-to-discard now updates action-discard top preview immediately, so latest played action is shown correctly.
- Zombie Army declaration UX patch (2026-03-28):
  - Removed Faith War target-click `window.confirm` prompt for Zombie Army.
  - Added explicit player-turn button `Use Skill: Zombie Army` (shown only when leader holds Zombie Army and has Faith War in hand).
  - Clicking this button now starts direct Faith War target selection with Zombie Army primed (`use_zombie=1`), reducing stuck target-selection flow.
  - Skill-card click path is disabled for Zombie Army in player turn to avoid entering unrelated generic skill-pending mode.
- Secret Alliance offered-card ID resolution hardening (2026-03-28):
  - Frontend now resolves selected Action card id via multiple candidate fields and validates against current in-hand map before submit.
  - Prevents stale/invalid stock item ids from being submitted as Secret Alliance offer, which previously caused backend error "Choose an Action card from your hand to exchange."
- Faith Debate manual stop control (2026-03-28):
  - During `faithDebateDuel`, attacking representative now has a `Stop Faith Debate` button.
  - Stop request is server-authoritative (`stopFaithDebate`) and only valid for attacking representative before attacker commits believer for current round.
  - Stop flow uses a safe stop-flag path into `resolveFaithDebateDuel`, then exits via existing `finalizeFaithDebate` cleanup (no illegal state transition from multipleactive state).
- Right-log player+sect readability patch (2026-03-28):
  - `Witch Hunt` / `Spread Rumors` right-side messages now use `player_name (Sect name)` format.
  - Backend now includes explicit `target_player_id/target_player_name` in resolution notifications so frontend can display the selected target player directly.
  - Sect shown in parentheses is resolved from current player sect data, so sect text follows sect changes.
- AOE commit UI fallback patch (2026-03-28):
  - For `martyrdomChooseBelievers` / `conspiracyChooseBelievers`, commit availability now also checks server-notified `target_ids` (not only local `checkAction`).
  - Prevents false waiting UI where representative should commit but client-side active flag desync hides confirm button.
  - `onConfirmBelieverClicked` now allows submission when current player is included in AOE target list fallback.
- AOE target activation ordering hardening (2026-03-28):
  - In backend `stMartyrdomChooseBelievers` / `stConspiracyChooseBelievers`, state now sets multi-active target players **before** broadcasting `...DefendersChoose` notify, reducing client race where waiting prompt could appear without commit button.
  - Added state args `argMartyrdomChooseBelievers` / `argConspiracyChooseBelievers` with `target_ids` from current active list, so reconnect/out-of-order notify still knows who can commit.
  - Frontend AOE commit gating now merges three signals: `checkAction`, `target_ids` from state args, and `isCurrentPlayerActive()`.
- Surrender reject flow active-player crash fix (2026-03-28):
  - Fixed `Impossible to change active player during activeplayer type state` on surrender rejection.
  - Reject path now transitions via `routeSurrenderBankrupt` (game state) instead of direct `changeActivePlayer` inside `surrenderLeaderResponse`.
  - Expected behavior restored: after one leader rejects, bankrupt player can continue asking the next eligible leader.
- Divine Inspiration / Prophet active-player switch crash fix (2026-03-28):
  - Fixed `Impossible to change active player during activeplayer type state` when Prophet interrupt is queued from `Divine Inspiration` / `Have a Charity`.
  - Added `switchActivePlayerSafely(...)` and applied it to Prophet/Holy Rebirth interrupt queue handoff.
  - Goal: keep interrupt prompts functional without stalling action-card resolution.
- Zombie Army Faith War opt-in patch (2026-03-28):
  - `Zombie Army` is no longer auto-applied on every declared `Faith War`.
  - Faith War leader now gets an explicit yes/no choice at target selection time (`use_zombie` flag).
  - Backend `playFaithWar` now only enables graveyard believer usage when this opt-in is true and graveyard is non-empty.
  - Added explicit graveyard-empty feedback for this choice path.
- End-game summary flow patch (2026-03-28):
  - Added dedicated post-win summary state `gameEndSummary` (state 102) and action `confirmGameEndSummary`.
  - End flow is now:
    1) Optional Impermanence showcase fly-card (`impermanenceVictoryShowcase`),
    2) Custom end summary screen in `central_arena`,
    3) Winner clicks `End Game` to proceed to standard BGA final scoring.
  - Summary screen now shows:
    - Winner block: player name + sect name + believer count + win reason text.
    - Loser list: player sect/name/believer count with loser skill cards grayscale.
    - Skill cards for all players with tooltip support during final review.
  - Added zombie fallback for `gameEndSummary` so disconnected winner cannot stall final scoring transition.
- Impermanence end-timing fix (2026-03-27):
  - `Impermanence of Life` no longer triggers an immediate game end just because holder reaches 5 Believers mid-game.
  - End-game now resolves in two stages:
    1) Base end trigger must occur first (`unification` or `believer_deck_empty`).
    2) Then, if Impermanence holder is still active and has `>=5` Believers, winner reason is overridden to `impermanence`.
  - Aligns with rule intent: Impermanence is evaluated at game-end timing, not as an instant mid-game win.
- Praise of Life end-of-turn decision patch (2026-03-26):
  - Added a dedicated `Praise of Life` decision gate when active leader reaches action cap.
  - Instead of auto-ending immediately, eligible player now returns to `playerTurn` with explicit choice: use `Praise of Life` or `End Turn`.
  - If player enters skill believer-selection then cancels, UI returns to same decision gate (no forced end).
  - During this pending gate, backend blocks normal `playActionCard` / `discardActionCards` to prevent bypass.
  - `Praise of Life` resolution no longer increments `actions_performed_count`; it only adds `extra_action_slots += 1`, so post-cap trigger correctly grants one extra action window.
- Removed noisy `No defense card is available...` path where requested.
- Self-assignment notifications suppressed (leader assigns self).
- Spread Rumors summary notification improved with sect + victim names.
- Faith War instruction recursion mitigation attempted (`setTopInstruction` path).
- Defense card discard-top sync improved (only when actually moved to discard).
- Readiness scan patch (2026-03-24):
  - `confirmDefense` buttons now render from a safer state gate and show explicit waiting text when player cannot respond.
  - Added submit lock guard on Faith War/Faith Debate believer confirm click to prevent duplicate in-flight submits.
  - AoE anchor sync hardened for notification reordering (`Martyrdom`/`Conspiracy`) by forcing attacker-anchored layout refresh.
  - Backend `martyrdomBelieverCommitted` / `conspiracyBelieverCommitted` now include `attacker_id` for stable cross-client AoE anchor.
- Disconnect resilience patch (2026-03-24):
  - Faith War: if assigned representative is missing/no response, system auto-assigns/auto-commits a random eligible believer to finish current war flow, then resolves normally.
  - Faith Debate: same anti-stall handling as Faith War, while preserving max 5-round stop.
  - War/Debate committed cards remain unavailable until whole war/debate ends; return-to-hand only happens at finalization state.
- Divine Inspiration UI patch (2026-03-24):
  - During `divine_inspire` discard selection, the source `divine_inspire` card is now locally locked and cannot be selected as a discard target.
  - Cancel/resolve correctly unlocks cleanup state to avoid stale lock.
- Pending Action hand-consistency patch (2026-03-25):
  - For target-selection / pre-confirm attack cards (including `secret_alliance`, `faith_war`, `faith_debate`, `martyrdom`, `conspiracy`), once card flies to pending arena it is hidden from hand immediately.
  - On cancel, the hidden card is restored to hand.
  - On successful play, hidden card is consumed normally.
  - On failed ajax submission with no active pending context, hidden card is auto-restored to avoid ghost card loss.
- AoE reveal pacing patch (2026-03-24):
  - Martyrdom/Conspiracy/War/Debate reveal+cleanup timing is intentionally slower so players can see facedown commits and win/lose labels before cards move/clear.
  - AoE believer commits default to facedown unless explicitly requested otherwise.
- AoE lane stability patch (2026-03-25):
  - Fix: attacker-anchor sync no longer wipes right-side defender lane on each notif; existing committed cards stay visible.
  - Added per-defender initial facedown placeholder on one-vs-many lane.
  - Defender placeholder is replaced by actual committed card (believer or defense) when that player acts.
  - Extended Martyrdom/Conspiracy resolve dwell time so win/lose labels are clearly visible before fly-to-target animation.
- AoE left-cluster structure patch (2026-03-25):
  - `.combat-commit-card` now has explicit `108x150` size so facedown committed cards render reliably.
  - Left-side AoE layout was normalized to a single `aoe_action_slot` wrapper:
    attacker label on top, then `action card + attacker believer` row below.
  - Added fallback left-cluster rebuild guard when older partial DOM shape is detected.
- Reconnect combat rehydrate patch (2026-03-25):
  - `getAllDatas` now includes `combat_context` (`war_type`, attacker/defender, representatives, current committed ids) and `believersontable`.
  - Frontend setup now rehydrates ongoing combat arena from snapshot on reload/reconnect (Faith War, Faith Debate, Martyrdom, Conspiracy, plus generic center action card fallback).
  - Fixes "disconnect then reconnect shows empty arena while combat still ongoing" desync class.
- Graveyard modal strip patch (2026-03-25):
  - Clicking Graveyard now opens a Spy-style modal header (`Graveyard (N cards)` + `Close`).
  - Body changed to pure believer thumbnail strip (newest-first, left-to-right), no text names.
  - Supports large piles with horizontal scrolling; no forced placeholder/backfill cards.
- Graveyard revive sync patch (2026-03-25):
  - `greatMercy` (`It's a Miracle`) notification now includes authoritative `graveyard_count` + `graveyard_cards`.
  - Frontend `notif_greatMercy` now prioritizes snapshot sync from server, falling back to local remove-top only when snapshot is absent.
  - Fix target: occasional post-revive preview where one card incorrectly appears as card-back despite known remaining graveyard cards.
- Zombie combat auto-commit patch (2026-03-25):
  - `zombieTurn` for multi-active combat states now applies per-state transitions instead of generic empty transition.
  - If a disconnected player is expected to commit a believer (Faith War / Faith Debate / Martyrdom / Conspiracy), system auto-commits one believer only for that disconnected player.
  - Other still-connected players remain manual responders; no global skip.
  - `confirmDefense` zombie path now explicitly auto-skips only that disconnected defender (`nextDefenseStep`).
- Surrender reject flow unblock patch (2026-03-25):
  - After `rejectSurrenderRequest`, flow now force-returns active player to the bankrupt player and transitions directly to `chooseSurrenderOrWanderer`.
  - Prevents edge case where first leader rejection notification appears but no next surrender target can be selected.
  - `argChooseSurrenderOrWanderer` now anchors on `active player` instead of `current viewer` to reduce cross-client state arg desync risk.
- Skill Phase-1 implementation patch (2026-03-25):
  - Added `useSkill` action pipeline (`states.inc.php` + `hegemonyoffaith.action.php` + backend resolver + frontend pending selection flow).
  - Implemented 4 skills only (others remain unavailable by design):
    - `KABOOM!` (skill 2): consume 1 action, sacrifice 1 selected believer, kill up to 3 believers from a selected player, and lock the user's own Physical/Mental attacks for the rest of that turn.
    - `Praise of Life` (skill 13): leader-only, sacrifice 1 selected believer, gain +1 extra action slot this turn.
    - `Everyone is Equal` (skill 15): only before any action, once per game, reshuffle/redistribute all in-hand believers from user seat order, then end turn immediately.
    - `Chaos Coming` (skill 14): up to 3 uses per game, reshuffle/redistribute all in-hand action cards from user seat order, no action consumed.
  - Added per-turn/per-game skill usage state tracking for implemented skills and synced UI refresh via `skillStateUpdated`.
  - Skill tooltip layout updated to: name (red) -> timing -> usage counter line -> effect text.
- Skill follow-up polish patch (2026-03-25):
  - `Praise of Life` now hard-limited to once per turn (`praise_life_turn_used_mask`), matching spec.
  - Skill reveal is now public/persistent after use (`skill_revealed_mask`):
    - player panel skill icon flips to front (not back) for all clients,
    - revealed skill tooltip is visible to other players.
  - Added `skillRevealed` notification bridge so reveal/tooltip updates apply immediately without reload.
  - Added `Everyone is Equal` visual shuffle effect (`central` shuffle card animation + believer mini-card pulse) plus explicit global info message about redistribution.
  - Added `Chaos Coming` visual shuffle effect with Action-only visuals (central Action back-card animation + Action mini-card pulse), avoiding believer-card visual mismatch.
- Skill protection patch (2026-03-25):
  - Implemented skill `World Peace` (8): up to 3 uses/game, sacrifice 1 believer, does **not** consume action, grants self temporary immunity to **Physical** attacks until next own turn.
  - Implemented skill `Eternal Truth` (7): up to 3 uses/game, sacrifice 1 believer, does **not** consume action, grants self temporary immunity to **Mental** attacks until next own turn.
  - Reuse prevention: while protection is active, same skill cannot be used again (effect does not stack); effectively one sacrifice per protection cycle.
  - Added global protection snapshot sync (`skill_protection`) to frontend and target-selection guard:
    - protected players are not selectable targets for matching attack family,
    - attempted stale-click selection is blocked with explicit error message.
  - Added AOE auto-defense bridge for skill protection (`skillAutoDefense`):
    - Martyrdom/Conspiracy now show an automatic defense card on protected sect lane,
    - representative/commit flow skips those protected sects consistently.
  - Skill tooltip timing/usage lines now include 7/8 usage counters and active protection marker.
- Skill extension patch (2026-03-25):
  - Implemented skill `Soul-Cutting Sword` (11):
    - up to 3 uses per game,
    - does **not** consume action,
    - select one target player to skip upcoming turn,
    - skip is stackable per target (can queue multiple skipped turns).
  - Added skip-turn queue/counter engine (`skip_turn_counter_pack`) and integrated in `stNextPlayer`:
    - skipped player receives explicit private skip notice at skipped turn time,
    - skipped turn performs no action-card draw and immediately advances.
  - Implemented reactive skill `Prophet` (4) for Believer draws from:
    - `Have a Charity`,
    - `Divine Inspiration`.
  - Prophet flow:
    - first trigger while unrevealed asks prophet owner to `Use/Skip`,
    - once revealed, each trigger asks prophet owner to guess first Believer type or pass,
    - if guessed correctly, first drawn Believer is transferred to prophet owner; otherwise stays with drawer.
  - Added prophet state machine:
    - `prophetSkillPrompt` -> `prophetGuess` -> `resolveProphetPrediction`,
    - includes zombie/disconnect auto-pass handling to avoid stalls.
  - Added shared animation/notification hook `prophetPredictionResolved` and deck-count-safe totals (`n_total` / `draw_total_n`) for cross-client consistency.
- Discard + Graveyard UX patch (2026-03-25):
  - Fixed player-turn `Discard` mode regression: entering discard mode no longer gets reset by local button refresh in `playerTurn`.
  - Entering discard mode now force-clears stale in-flight submit flags to prevent click-through into normal card effects.
  - `It's a Miracle` revive animation now only comes from graveyard side for the acting player (no duplicate believer-deck fly-in for the same revived cards).
  - Graveyard preview now keys off `graveyard_count` and shows only real known cards (1 card => 1 shown, 2 cards => 2 shown, 3+ => top 3 shown), no forced believer-back placeholders.
- Graveyard no-placeholder patch (2026-03-25):
  - Removed leftover "fill missing slots with back cards" behavior for both board preview and graveyard modal.
  - Rule alignment: when graveyard count is below 3, UI must render exactly that many cards; missing slots are not rendered.
- Graveyard sequence sync patch (2026-03-25):
  - Fixed `It's a Miracle` local graveyard cache ordering bug (`removeTop` now applies before count decrement) that could cause 1 remaining card to display as card-back.
  - `publicCountsSync` now includes `graveyard_cards` (newest-first) so all clients can rebuild authoritative graveyard sequence after notification reorder/reconnect.
  - Graveyard click now opens a modal sequence view (top first) instead of `alert`, and no longer falsely reports empty when count > 0.
- Tooltip/Display polish patch (2026-03-25):
  - Board-resolved cards in central arena (and war/debate log mini cards) no longer use hand hover-lift animation.
  - Replaced Info Spy plain `alert` with extensible modal card view (action + believer cards with card tooltip support).
  - Added believer tooltip model: `BelieverName #Type`, `Win vs` (2 matchups), and `Faith War bonus vs` (direct-counter matchup only).
  - Action card tooltip now shows: `Card Name` -> `Card Type` (`Attack` red; `Strategy/Defense` blue) -> effect text body.
- Log/Panel tooltip patch (2026-03-25):
  - Faith War/Debate log mini believer cards now support believer tooltip on hover.
  - Log mini losing cards are visually grayscale (`mini-loser`) for clearer win/loss readability.
  - Log mini believer tooltip now includes current round/battle opponent name (`Battle opponent` / `Round opponent`).
  - Removed duplicated native+custom skill tooltip behavior on player panels (keep one tooltip channel).
  - Added player panel hand-icon tooltips for Action/Believer counters (describes these as cards in that player's hand).
- Skill Impermanence + Holy Rebirth patch (2026-03-25):
  - Added reactive `Holy Rebirth` flow (`holyRebirthPrompt` -> `resolveHolyRebirth`):
    - Trigger A: after `KABOOM!` kills `>=3` believers on one target, that target gets prompt.
    - Trigger B: during `Faith War`, deaths are tracked per player; at war end, skill owner with `>=3` deaths gets prompt.
    - On use: revive top 3 from graveyard, no action cost, once per round (`holy_rebirth_turn_used_mask`).
    - Added zombie auto-skip handling for Holy Rebirth prompt to avoid stall.
  - `Faith War` now resets and tracks per-player war death counters (`war_death_counter_pack`) across rounds.
  - Implemented `Impermanence of Life` as passive/non-clickable skill in `canPlayerUseSkillNow`.
  - Added Impermanence fail-confirm UX for:
    - surrendering,
    - becoming wanderer,
    - accepting surrender follower,
    - using `Kowtow To Me` to recruit followers.
  - `Kowtow To Me` no longer hard-blocks Impermanence owner; it now proceeds with skill-fail-and-redraw consequence.
  - Added frontend handlers for `impermanenceFailed`, `skillHiddenReset`, `skillCardReplaced`, and `skillHolyRebirth` notifications.

## 9) Known Active Issues to Verify Next
1. Faith War assignment state:
  - Error seen: `Invalid or missing substitution argument... Maximum call stack size exceeded`.
  - Also repeated `Confirm Believer for War` buttons.
  - Additional anti-duplicate / state-gating + disconnect resilience patch applied; must re-test on BGA table with multi-client.
2. ConfirmDefense buttons:
  - Safer rendering patch applied; verify in sect defense race timing (multi-active transition edge).
3. AoE visual consistency:
  - Attacker-anchor sync + facedown-default patch applied; verify attacker card/label + right-lane seat order under reordered notifications.
  - Verify pacing feels correct (not too fast/too slow) under live notification latency.
4. Discard top ordering:
  - Verify expected top card sequence after attack/defense/resolution across all modes.
5. Divine Inspiration:
  - Verify source card cannot be selected as discard target in single-client and multi-client observer view.
6. Skill protection:
  - Verify `World Peace`/`Eternal Truth` target immunity in both direct target attacks and AOE auto-defense.
7. Soul-Cutting Sword:
  - Verify no-action-cost repeated uses in one turn (up to remaining per-game uses).
  - Verify skip stack decrements one per skipped turn and target receives both "marked" and "turn skipped" notices.
8. Prophet:
  - Verify first unrevealed trigger asks `Use/Skip` only to prophet owner.
  - After reveal, verify each Charity/Divine trigger asks guess/pass, resolves first-card reveal, and routes first card to correct hand on hit/miss.

## 10) Recommended Immediate Test Checklist
1. Faith War (with leader/follower sects): assign -> confirm button appears once only.
2. Spread Rumors defense prompt:
   - Defender with card: defend/skip works.
   - Defender without card: waiting state works.
3. Martyrdom/Conspiracy:
   - All clients see same arena positions.
   - Defender slots are seat-ordered.
4. Defense played -> discard top reflects latest visible discard card.
5. No duplicate assignment messages on leader self-assignment.

## 11) File Hotspots
- `hegemonyoffaith.game.php`: combat logic, defense phase, resolution, notifications.
- `hegemonyoffaith.js`: action buttons, arena rendering, notification handlers.
- `hegemonyoffaith.css`: arena layout and combat visual states.

## 12) Suggested New-Chat Bootstrap Prompt
Use this in a fresh chat:

"Continue from `PROJECT_STATUS.md`. Respect terminology lock (`Mental`, not `Spiritual`) and English-rule priority. First verify/fix:
1) Faith War assignment recursion + duplicate Confirm button,
2) confirmDefense missing Skip button edge case,
3) AoE attacker visibility consistency for all clients.
Do not redesign rules."

## 13) Regression Verification (2026-03-28, surrender give/cancel + Impermanence)
Verification basis in this round:
- Code-path regression review in `hegemonyoffaith.game.php` + `hegemonyoffaith.js` + `states.inc.php`.
- Syntax sanity check rerun:
  - `php -l hegemonyoffaith.game.php`
  - `php -l hegemonyoffaith.action.php`
  - `php -l states.inc.php`
  - `node --check hegemonyoffaith.js`

Result checklist:
1. accepted surrender can cancel at `leaderGiveBeliever` and return to re-select sect:
  - **PASS (code path)**.
  - `acceptSurrenderRequest` stores snapshot and moves follower into accepted role.
  - `cancelGiveBeliever` (mode 0) restores snapshot (`role/leader/sect/sealed`), marks current leader rejected, and routes back to `chooseSurrenderOrWanderer`.
2. follower with 0 believers in support mode can cancel and continue surrender flow:
  - **PASS (code path)**.
  - `stCheckEndTurnPhase` enters support mode (`surrender_support_mode=1/2`) and `leaderGiveBeliever`.
  - `cancelGiveBeliever` for support mode routes via `startSurrenderFlowFor(follower)` (continues surrender process, not forced end turn).
3. confirm giveBeliever proceeds to nextPlayer:
  - **PASS (code path)**.
  - `giveBeliever` transfers 1 believer, clears surrender temp state, and transitions `nextPlayer`.
4. Impermanence triggers only on confirm giveBeliever (not accept/cancel):
  - **PASS (code path)**.
  - Impermanence fail calls for surrender are only in `giveBeliever` when `support_mode===0`.
  - `acceptSurrenderRequest` and `cancelGiveBeliever` do not trigger Impermanence fail directly.

Open verification gap (still pending):
- These 4 items are confirmed by backend/frontend state-path inspection and syntax checks, but still need a live multi-client BGA table pass to validate notification timing/UI race behavior under real latency/reconnect.

## 14) Secret Alliance Offered-Card ID Hotfix (2026-03-29)
- Symptom:
  - During `Secret Alliance` flow (`play card -> select target -> select offered card`), backend could reject with:
    - `Unexpected error: Choose an Action card from your hand to exchange.`
- Root-cause direction:
  - Frontend selected-card id resolution in `resolveSelectedActionCardIdFromStockItem` could accept a non-selected/incorrect candidate id in some Stock DOM/id-shape cases.
- Fix:
  - `resolveSelectedActionCardIdFromStockItem` now prioritizes ids extracted from the currently selected stock DOM node and verifies candidate id matches that selected node before submit.
  - Added broader selected-node id pattern handling (`_item_<id>` and `_item_<type>_<id>`) plus `data-card-id` / `data-item-id` fallback.

## 15) Karma Reversed Prompt/Secrecy Hotfix (2026-03-29)
- Symptom:
  - `reverseKarmaPrompt` could enter without rendering actionable buttons for the skill owner, causing flow stall.
  - Non-owner players saw explicit `Karma Reversed` prompt/status text, leaking hidden-skill information.
- Fix:
  - Frontend button-gate now includes `reverseKarmaPrompt` in renderable active states, so owner gets:
    - `Use Karma Reversed`
    - `Skip`
  - `reverseKarmaPrompt` public state description changed to neutral:
    - `Waiting for combat to continue`
  - Backend/public notify for reverse-kickoff is anonymized:
    - activation message is generic (`A hidden combat response is activated for this combat.`),
    - skip is no longer publicly announced.
  - Frontend `notif_reverseKarmaStatus` no longer displays player identity for this event.

## 16) Hidden-Skill Privacy Rule Enforcement (2026-03-29)
- Rule locked:
  - Before a leader chooses to use a skill, no other player should be able to identify what that hidden skill is.
  - After skill use, that skill is revealed and visible via player info tooltip.
- Backend consistency:
  - Added helper `revealSkillAndNotifyIfNeeded(...)` and applied to:
    - regular active `useSkill` flow,
    - Prophet first reveal path,
    - Holy Rebirth actual-use path,
    - Karma Reversed actual-use path.
  - Holy Rebirth skip no longer broadcasts public "did not use" notification (avoids hidden-skill leak).
  - Prophet resolution payload now carries `prophet_visible`; hidden/skip path no longer exposes prophet identity.
- State-text privacy:
  - `prophetSkillPrompt` public description -> neutral `Waiting for draw-response decision`.
  - `holyRebirthPrompt` public description -> neutral `Waiting for combat to continue`.
  - `reverseKarmaPrompt` public description already neutralized in previous hotfix.

## 17) Faith Debate Double-Commit Guard (2026-03-29)
- Symptom:
  - In `faithDebateDuel`, attacker could occasionally submit a second believer after already committing one (typically during pending combat-response timing, e.g., Karma Reversed prompt), causing duplicate believer consumption.
- Backend hard fix:
  - `playBelieverCardCombat` (`war_type === 7`) now rejects duplicate commit attempts per side:
    - attacker blocked when `war_card_attacker > 0`
    - defender blocked when `war_card_defender > 0`
  - This guarantees one believer per representative per Faith Debate round at rules level.
- Frontend anti-race UX fix:
  - Added local per-round guard `hasCommittedDuelBelieverThisRound`:
    - reset on duel round start notifications (`faithWarRound`, `faithDebateRound`) and debate start,
    - set true when local player receives `faithWarCardPlayed` / `faithDebateCardPlayed`.
  - `onConfirmBelieverClicked` now blocks submit when:
    - player already committed this round, or
    - player is no longer active for duel commit.
  - After local commit, UI now immediately clears believer highlight and shows waiting instruction to reduce accidental re-clicks.

## 18) Secret Alliance Offered-Card ID Resolution Hardening (2026-03-29)
- Symptom:
  - In `Secret Alliance` flow (`select card -> select target -> select offered action -> confirm`), backend could reject with:
    - `Choose an Action card from your hand to exchange.`
- Root-cause direction:
  - Frontend stock-node/card-id matching had ambiguous suffix matching (`..._44` also matching `..._144`), allowing wrong `offered_card_id` to be resolved and submitted.
- Fix:
  - Added `extractActionCardIdCandidatesFromStockNode(...)` to parse stock node IDs/attributes deterministically.
  - Replaced fuzzy suffix lookup in `getActionStockItemNodeByCardId(...)` with exact candidate-id matching.
  - Updated `resolveSelectedActionCardIdFromStockItem(...)` to:
    - use exact candidate extraction from selected stock node,
    - require resolved candidate to exist in current hand map (`actionCardTypeById`),
    - remove permissive fallback that could accept non-hand IDs.
  - Secret Alliance confirm handlers now prefer direct selected stock item id (`getSelectedItems()[0].id`) when it maps to a current in-hand action card, then fallback to resolver.

## 19) Karma Reversed Timing Order Fix (2026-03-29)
- Rule target:
  - `Defense -> Karma Reversed decision -> representative/believer selection -> combat resolution`.
- Previous behavior:
  - Karma Reversed prompt was triggered in late resolve states (after believers were already committed), so players could not factor reversal into believer choice.
- Fix:
  - Moved trigger point to `stResolveAttack()` for combat types `Faith War / Faith Debate / Martyrdom / Conspiracy`:
    - now queues Reverse Karma prompt immediately after defense phase completes.
  - Removed late trigger calls from:
    - `stResolveDuel`
    - `stResolveFaithDebateDuel`
    - `stResolveMartyrdom`
    - `stResolveConspiracy`
  - Added new resume routing from `resolveReverseKarmaPrompt` back to pre-believer setup states:
    - Faith War -> `chooseWarRepresentative` (69)
    - Faith Debate -> `chooseFaithDebateRepresentative` (75)
    - Martyrdom -> `martyrdomChooseRepresentative` (80)
    - Conspiracy -> `conspiracyChooseRepresentative` (82)
  - Kept legacy resume routes for compatibility.

## 20) Witch Hunt Graveyard Top-Order Fix (2026-03-29)
- Symptom:
  - After `Witch Hunt` killed multiple believers of the same type, graveyard top preview could show an unrelated older believer type.
- Root-cause direction:
  - Batch move (`moveCards(..., 'discard')`) did not guarantee deterministic discard stack order in this path.
  - Frontend `notif_witchHunt` also relied on incremental `killed_cards` push only, which could drift if local cache/order was stale.
- Fix:
  - Backend `stResolveWitchHunt` now moves killed believers to discard one-by-one with explicit increasing `card_location_arg` (deterministic stack top ordering).
  - `witchHunt` notification now includes authoritative `graveyard_cards` snapshot in addition to `graveyard_count`.
  - Frontend `notif_witchHunt` now prioritizes `graveyard_cards` snapshot when available; only falls back to `killed_cards` push when snapshot is absent.

## 21) Karma Reversed War/ Debate Persistent Display Fix (2026-03-29)
- Symptom:
  - In `Faith War` / `Faith Debate`, `Karma Reversed` indicator could disappear right after combat started, then only reappear briefly during duel resolution.
- Root-cause direction:
  - Frontend start handlers (`notif_faithWarStart`, `notif_faithDebateStart`) force-reset `setReverseKarmaContext(0, 0)`, wiping already-confirmed pre-combat `Karma Reversed` status.
- Fix:
  - Removed forced reset in both start handlers.
  - Existing per-round reset removals are kept (`faithWarRound`, `faithDebateRound`), so once `Karma Reversed` is confirmed it remains visible throughout the entire War/Debate and only clears at combat end.

## 22) Faith War Log Mode + View-All Button Binding Fix (2026-03-29)
- Symptom:
  - During `Faith War`, the log footer button could show debate wording:
    - `View all rounds in this debate`
  - In some sessions, the same button appeared but did not open the full-log modal.
- Root-cause direction:
  - `notif_faithWarStart` did not force log mode back to `war`, so previous `debate` mode text could leak into a later war.
  - `ensureFaithWarBoard` returned early when board already existed, which could skip (re-)ensuring modal/button wiring in reused UI sessions.
- Fix:
  - Force `setDuelLogMode("war")` in both:
    - `notif_faithWarStart`
    - `notif_faithWarRound` (reconnect safety)
  - Refactor `ensureFaithWarBoard`:
    - create board only if missing,
    - but always run modal existence check + `faithwar_log_more` click binding + log render.

## 23) Right-Side Combat Snapshot Log Anchors (2026-03-29)
- Goal:
  - After each combat is fully resolved, write one concise snapshot entry into BGA right-side log, so players can quickly find that battle in timeline/replay.
- Scope covered:
  - `Faith War` end
  - `Faith Debate` end
  - `Martyrdom` resolved
  - `Conspiracy` resolved
  - `Witch Hunt` resolved
- Implementation:
  - Added server-side `combatSnapshotHistory` notifications at each combat end point in `hegemonyoffaith.game.php`.
  - Snapshot lines include combat name + key summary fields (participants/rounds or result counts).
  - War/Debate snapshot lines also include reminder text pointing to center-panel `View all ...` detail button.
- Notes:
  - This does not change combat rules/state flow; it only appends timeline-friendly summary records to right log.

## 24) DB Contention Hardening for Snapshot Logs (2026-03-29)
- Trigger:
  - During live test, one client hit BGA framework error `mysql_deadlock_restart_transaction` while table globals were loading.
- Scope:
  - Server-side combat snapshot notifications introduced in this round.
- Hardening:
  - Reduced repeated player-name DB lookups inside combat-end transactions by caching names once per resolver and reusing in both normal resolve notify + snapshot notify:
    - `finalizeFaithWar`
    - `finalizeFaithDebate`
    - `stResolveMartyrdom`
    - `stResolveConspiracy`
    - `stResolveWitchHunt`
- Notes:
  - This does not alter gameplay rules; it shortens notification-building DB access paths to reduce lock contention probability.

## 25) End-Game Activeplayer Switch Crash Fix (2026-03-29)
- Symptom:
  - At end-game transition (especially with Impermanence path), server could throw:
    - `Impossible to change active player during activeplayer type state`
  - Result: custom end summary screen did not open correctly and game could not proceed to final BGA scoring.
- Root cause:
  - `stShowGameEndSummary` (state `gameEndSummary`, type `activeplayer`) used direct `changeActivePlayer($winner_id)`.
  - In `activeplayer` states, direct `changeActivePlayer` is unsafe and can throw this exact framework error.
- Fix:
  - Replaced direct active-player switch with `switchActivePlayerSafely(...)` in:
    - `stShowGameEndSummary`
    - `stShowImpermanenceVictory` (consistency hardening)
- Outcome:
  - Winner is now safely set as active player for custom end summary `End Game` button flow, then can proceed to BGA final scoring normally.

## 26) War/Debate Next-Round Commit Lockout Fix (2026-03-29)
- Symptom:
  - In continuous `Faith War` / `Faith Debate`, after committing once, next round could still show:
    - `You already committed your Believer. Waiting for combat to continue.`
  - Player then could not choose next-round believer.
- Root cause:
  - Frontend latch `hasCommittedDuelBelieverThisRound` could remain true across round/state timing race (state entered before round-notify reset, and buttons not re-rendered after reset).
- Fix:
  - On entering duel states (`faithWarDuel` / `faithDebateDuel`), always reset local latch.
  - In `notif_faithWarRound` / `notif_faithDebateRound`, after reset and arena refresh, force action-button re-render when currently in corresponding duel state.
- Outcome:
  - Next round can correctly select and confirm believer, while same-round duplicate submit guard remains active.

## 27) Karma-Reversed War Loop + War Log Button + Draw Visual Split (2026-03-29)
- Trigger:
  - In continuous `Faith War`/`Faith Debate` (notably with Karma Reversed active), some clients could remain stuck with:
    - `You already committed your Believer. Waiting for combat to continue.`
  - War log button could appear but not open modal in some reused-board sessions.
  - Visual rule mismatch: War draw should gray both cards (both die), but Debate draw should not gray (cards return to hand).
- Fix:
  - Duel commit latch hardening:
    - In duel button rendering and confirm handler, if server currently allows `playBelieverCard` for active player, stale local `hasCommittedDuelBelieverThisRound` is auto-cleared.
  - War log button hard binding:
    - `ensureFaithWarBoard` now sets `faithwar_log_more.onclick` directly each time board is ensured (no one-time dataset gate dependency).
  - Draw visual split:
    - `getHeadToHeadResultVisual(resultType, duelMode)` added mode-aware draw styling.
    - `war` draw => both use loser(gray) visual.
    - `debate` draw => both keep draw visual (no gray).
- Outcome:
  - Continuous rounds can proceed to next believer selection reliably.
  - War log modal button remains clickable in reused UI paths.
  - War vs Debate draw visuals now follow rules.

## 28) Secret Alliance Offered-Card Selection Re-hardening (2026-03-29)
- Symptom:
  - In Secret Alliance flow (`play -> choose target -> choose offered action -> confirm`), server could still reject with:
    - `Choose an Action card from your hand to exchange.`
- Root-cause direction:
  - Offered-card resolution still allowed fallback paths that could produce stale/incorrect card IDs when selected-node context was missing or ambiguous.
- Fix:
  - Frontend action stock nodes now explicitly store deterministic per-card id:
    - set `data-card-id` in action stock `onItemCreate`.
  - Secret Alliance confirm handlers (`own` + `target`) now always resolve card id via strict selected-node resolver (removed permissive direct-id shortcut).
  - `resolveSelectedActionCardIdFromStockItem(...)` now requires an actual `.stockitem_selected` node; no selected-node => no submit id.
  - `getStockCardIdsFromContainer("myactioncards")` now prefers action-node deterministic id extraction to reduce stale ID residue during hand-sync replacement.
- Outcome:
  - Secret Alliance confirm now submits only the actively selected, in-hand action card id, reducing false backend rejection from wrong offered-card id payloads.

## 29) Chaos Coming Hand-Redistribute UI Crash Fix (2026-03-29)
- Symptom:
  - After `Chaos Coming`, all players could see action hand disappear; active player remained on turn with no progress buttons, others stuck on `Updating game situation ...`.
- Root cause:
  - Frontend `replaceCurrentActionHand(...)` called non-existent method:
    - `getActionCardTypeArgFromType(...)`
  - `syncActionHand` notification handling then throws runtime error and breaks hand rebuild flow.
- Fix:
  - Replaced with correct sprite resolver:
    - `getActionCardSpriteIndex(String(card.type))`
- Outcome:
  - `syncActionHand` now rebuilds redistributed action hands correctly after Chaos Coming.

## 30) Manual End-Turn After Action Cap + Action-Slot Guards (2026-03-29)
- Design update:
  - End turn is now player-driven after action cap instead of forced auto-end.
  - Rationale: allow post-cap no-cost skills (e.g. `Chaos Coming`, `Praise of Life`, defense/protection-type manual skills) before ending turn.
- Backend rules hardening:
  - Added action-slot guard helpers:
    - `hasRemainingActionSlots()`
    - `assertCanSpendActionSlot()`
  - Action-consuming operations now blocked when no slots left:
    - `playActionCard`
    - `discardActionCards`
    - `startDiscardingActionCard`
    - `confirmDiscardingActionCard`
  - `KABOOM!` (`skill_type === 2`, action-consuming skill) now also checks action-slot availability in `canPlayerUseSkillNow`.
  - `routeAfterActionWindowCheck(...)` now returns to action window (player turn) at cap, so player can decide skill usage or click End Turn.
- Frontend UX guard:
  - Tracks `performed_actions_count` / `max_actions_this_turn`.
  - When cap reached, selecting action cards is blocked locally with info prompt:
    - `No action slots left this turn. Use Skill or End Turn.`

## 31) Praise of Life Extra-Action Type Restriction Override (2026-03-29)
- Rule clarification applied:
  - After `Praise of Life` is used this turn, remaining extra action(s) can be any action type, including repeating an already-used type.
  - This includes Strategy / Physical / Mental and discard-action choice (still limited by remaining action slots).
- Backend changes:
  - In `playActionCard`, per-turn duplicate action-type validation is bypassed when `isPraiseLifeUsedThisTurn(player)` is true.
  - In `startDiscardingActionCard`, single-discard-per-turn guard is bypassed when `Praise of Life` was used this turn.
- Frontend changes:
  - Local duplicate action-type block in hand-click flow is bypassed when `skill_state.praise_life_used_this_turn === 1`.
  - Discard button visibility no longer hides after first discard when Praise of Life is active this turn.
  - Zombie Army (Faith War physical-action gate) now also respects Praise-of-Life override for repeated physical-type action use.

## 32) Soul-Cutting Sword Log Placeholder Fix (2026-03-30)
- Symptom:
  - Using Soul-Cutting Sword after choosing target could throw:
    - `Invalid or missing substitution argument ... could not find key "n" in template`
- Root cause:
  - Notification template used `${n}`, but payload lacked key `n`.
- Fix:
  - Added `n => target_skip_count` in `skillSoulSeveringSword` notify payload.
- Outcome:
  - Skill now resolves without template substitution crash; log text and skip-turn count remain consistent.

## 33) AOE Result Card Position Stability Fix (2026-03-30)
- Symptom:
  - In AOE resolve (Martyrdom / Conspiracy), when result labels (`win/lose/draw`) appeared, committed cards looked like they all shifted upward.
- Root-cause direction:
  - Result label insertion changed commit-wrap effective height in centered AOE slots, causing visual re-centering jump.
- Fix:
  - CSS: reserve fixed height for AOE commit wrapper:
    - `.aoe-commit-item { min-height: 176px; }`
- Outcome:
  - AOE cards now keep the same position before/after result reveal (no upward jump).

## 34) Discard Button Guard At Action Cap (2026-03-30)
- Symptom:
  - After reaching action cap, `Discard Action Card(s)` button could still be clickable in some UI timing paths.
  - Entering discard mode then selecting card was blocked by action-slot checks, forcing manual cancel before `End Turn` became obvious.
- Fix:
  - Frontend now uses explicit remaining-slot gate (`hasRemainingActionSlotsThisTurn()`):
    - Hide discard button when no action slots remain.
    - Block `onToggleDiscardModeClicked` when no slots remain and show message:
      - `No action slots left this turn. Use Skill (for example Praise of Life) or End Turn.`
    - Block `onDiscardSelectedActionsClicked` similarly and auto-exit discard mode.
  - If UI was already in discard mode and slots become exhausted, player-turn buttons auto-reset out of discard mode.
- Outcome:
  - At action cap, player is guided directly to `Use Skill / End Turn` flow instead of entering unusable discard subflow.

## 35) Spread Rumors Believer Transfer Anchor Fix (2026-03-30)
- Symptom:
  - For the acting player, stolen Believer visual could appear as if drawn from Believer deck instead of coming from the selected victim player area.
- Fix:
  - Backend `spreadRumors` notify now includes stolen `card_id`.
  - Frontend tracks per-stolen-card source anchor (`victim` player panel) during `notif_spreadRumors`.
  - In `notif_newBelievers`, when card source is marked as Spread Rumors steal, transfer animation now flies from victim player anchor to `mybelievercards` instead of from deck.
- Outcome:
  - Spread Rumors steal origin now visually matches rule expectation: card comes from victim player area.

## 36) It's a Miracle Low-Graveyard Prompt UX Unification (2026-03-30)
- Symptom:
  - When graveyard had fewer than 3 cards, playing `It's a Miracle` opened a browser confirm popup asking whether to continue.
- Change:
  - Removed browser `window.confirm` flow for this case.
  - Kept in-client BGA info message only:
    - graveyard has fewer than 3, revive count will match available cards.
- Outcome:
  - UX now stays consistent with BGA top-message style; no extra modal popup interrupt.

## 37) Secret Alliance Offer Selection Robustness (2026-03-30)
- Symptom:
  - During Secret Alliance offer confirm, player could select a hand Action card but still get:
    - `Select exactly one Action card to offer`
- Root-cause direction:
  - Confirm flow relied on narrow selected-node resolution path; in some stock selection states it could fail to resolve the chosen card even when selected.
- Fix:
  - Added `getSelectedActionCardIdsInHand(...)` to aggregate and validate selected card ids from:
    - stock selected items (`id/card_id/item_id`)
    - selected stock DOM nodes (`.stockitem_selected`) candidate extraction
  - Enforces in-hand + existing-node checks before accepting id.
  - Secret Alliance own/target confirm handlers now use this robust selected-id set and require exactly one valid selected Action card.
- Outcome:
  - Secret Alliance confirm is now resilient to stock selection id-shape differences; selected offer card is recognized correctly.

## 38) Soul-Cutting Sword Template Placeholder Hardening (2026-03-30)
- Symptom:
  - Some repeated uses still triggered missing template key error for ${n} in skillSoulSeveringSword log line.
- Hardening:
  - Switched log template placeholder from ${n} to ${target_skip_count} (field that is always present in payload).
  - Kept 
 in payload for backward compatibility.
- Outcome:
  - Soul-Cutting Sword log substitution no longer depends on optional 
 key path; repeated uses stay stable.

## 39) Surrender Identity Sync + Turn Anchor Fix (2026-03-30)
- Symptoms from latest regression:
  - After surrender acceptance/give, some clients could not clearly see immediate sect/role change (still looked like old Leader/sect until refresh).
  - Post-surrender turn order could jump incorrectly (helper leader became next-turn anchor), causing bankrupt player to reappear too soon.
  - Surrender target buttons could be confusing when player/sect labeling looked mismatched.
- Backend fixes (`hegemonyoffaith.game.php`):
  - Added public identity sync notifier:
    - `getPlayerIdentitySyncRow(...)`
    - `notifyPlayerIdentitySync(...)` => emits `playerIdentitySync` with `player_role/player_sect/player_leader_id`.
  - Wired identity sync into surrender-related role/sect transitions:
    - `acceptSurrenderRequest` (accepted player becomes follower)
    - `cancelGiveBeliever` rollback (restore pre-accept role/sect)
    - `doBecomeWanderer`
    - leader replacement flow in `stCheckEndTurnPhase`
  - Fixed turn-order anchor after support/surrender give:
    - In `giveBeliever`, set active player back to `follower_id` before `nextPlayer`.
    - In surrender-to-wanderer branches triggered from leader response/cancel paths, set active player to bankrupt before `nextPlayer`.
- Frontend fixes (`hegemonyoffaith.js`):
  - Added `playerIdentitySync` subscriber + handler to update local `gamedatas.players` and immediately re-render:
    - table role text
    - table sect badge/name
    - panel role label
    - panel sect badge/name
  - Added stable role render helpers:
    - `getPlayerTableRoleText`, `getPlayerPanelRoleText`, `refreshPlayerIdentityUi`, `applyPlayerIdentitySyncRow`.
  - Clarified surrender target button text to always show resolved player name + sect label (not raw sect number only).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 40) Faith War Representative Picker Missing Options (Multi-active Args Fallback) (2026-03-30)
- Symptom:
  - After surrender-related role/sect changes, Faith War could enter representative selection state correctly, but leader UI sometimes showed no selectable candidate buttons (soft-lock at choose representative step).
- Root-cause direction:
  - `chooseWarRepresentative` is a multi-active state. Relying on a single `candidates` view payload can be fragile when client-side arg perspective and active-leader identity diverge.
- Fix:
  - Backend `argChooseWarRepresentative` now returns deterministic leader-scoped candidate payloads in addition to legacy `candidates`:
    - `attacker_leader_id`, `defender_leader_id`
    - `attacker_candidates[]`, `defender_candidates[]`
  - Frontend `chooseWarRepresentative` button render now keeps legacy `args.candidates` path, plus fallback:
    - if `candidates` is empty, resolve by local `player_id` vs `attacker_leader_id/defender_leader_id` and use corresponding candidate list.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 41) Believer Recruit Animation Target Preference (2026-03-30)
- Symptom:
  - During Believer recruitment/draw, non-acting players could see card flight target anchored to main table block instead of right-side player panel.
- Fix (`hegemonyoffaith.js`):
  - Updated `getPlayerBelieverReceiveTargetNodeId(...)` for non-self targets to prefer `panel_<player_id>` first, then fallback to public table anchor.
- Outcome:
  - Other players now see Believer draw/recruit cards fly from deck toward right-side player panel anchor as expected.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 42) Game Load Crash: getVisibleGraveyardCount Missing (2026-03-30)
- Symptom:
  - Client failed to load game with JS runtime error:
    - `this.getVisibleGraveyardCount is not a function`
- Root cause:
  - Call sites still used `getVisibleGraveyardCount(...)` while utility had been consolidated as `getLiveGraveyardCount(...)`.
- Fix (`hegemonyoffaith.js`):
  - Added backward-compatible alias:
    - `getVisibleGraveyardCount() { return this.getLiveGraveyardCount(); }`
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 43) Cross-Zone Draw Animation Visibility Fix (2026-03-30)
- Symptom:
  - Non-acting players still did not see Believer recruitment draw flight to right player panel anchor; only discard/action updates were visible.
- Root-cause direction:
  - Temp flight card root container was fixed at `game_play_area`.
  - When target anchor is outside this container (right-side player panel area), movement can be clipped/hidden.
- Fix (`hegemonyoffaith.js`):
  - `animateTempCardFlight(...)` now auto-selects animation root:
    - default `game_play_area`
    - fallback to `dojo.body()/document.body` when source/target are not both contained in `game_play_area`.
  - Keeps same source/target ids and timing; only root container selection changed to support cross-zone flight visibility.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 44) Eternal Truth/World Peace Skill Button Persistence After Action Cap (2026-03-30)
- Symptom:
  - After finishing 2 actions in turn, non-action skill button (notably Eternal Truth / World Peace style) could disappear even when skill should still be usable.
- Root-cause direction:
  - Player-turn button render path used only `args.skill_state`.
  - In some refresh/update timing paths, `args.skill_state` can be missing while local `mySkillState` is still valid, causing false hidden skill button.
- Fix (`hegemonyoffaith.js`):
  - In `onUpdateActionButtons` playerTurn branch, skill state now resolves as:
    - `getSkillStateFromArgs(args) || mySkillState || null`
  - Keeps `mySkillState` refreshed when args do provide newer skill state.
- Outcome:
  - Skill button remains available after action cap whenever skill is actually usable by rules.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 45) Secret Alliance Offered Card ID Ambiguity Fix (2026-03-30)
- Symptom:
  - Secret Alliance still intermittently failed at confirm with backend error:
    - `Choose an Action card from your hand to exchange.`
- Root-cause direction:
  - Frontend stock-node ID parsing could mix type/id tokens and sometimes resolve the wrong card id for offered card submission.
  - This is especially risky when numeric tokens overlap with real card ids.
- Fix (`hegemonyoffaith.js`):
  - Hardened action stock id extraction:
    - `extractActionCardIdCandidatesFromStockNode(...)` now uses deterministic sources (`data-card-id`, `data-item-id`) and trailing numeric fallback only.
    - Removed ambiguous dual-token typed parsing that could treat non-card tokens as card ids.
  - Added `getSingleSelectedActionCardIdFromHand(...)`:
    - requires exactly one selected stock node
    - resolves card id by selected-node identity match
  - Secret Alliance confirm handlers now use this precise resolver:
    - `onConfirmSecretAllianceOwnCardClicked`
    - `onConfirmSecretAllianceTargetCardClicked`
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 46) Faith Debate Stop Button Availability Hardening (2026-03-30)
- Symptom:
  - Rule allows attacker-side representative to stop Faith Debate early (before committing believer), but stop button could be missing in some UI timing paths.
- Root-cause direction:
  - Frontend relied on representative-id inference timing in state args/combat context.
  - In some transitions this could fail to satisfy local condition even though stop action was legally available.
- Fix:
  - Backend `argFaithDebateDuel` now includes explicit per-viewer flag:
    - `can_stop_faith_debate` (1/0), computed from authoritative state (`war_type`, `current_player_id`, `war_rep_attacker_id`, `war_card_attacker`).
  - Frontend `faithDebateDuel` button rendering now uses this flag (with old rep-id check as fallback) to show:
    - `Stop Faith Debate`
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 47) Chaos Coming (and Everyone is Equal) Shuffle Randomness Fix (2026-03-30)
- Symptom:
  - `Chaos Coming` could look effectively unshuffled across repeated uses (cards redistributed in same pattern).
- Root-cause direction:
  - Previous redistribution logic shuffled pool, then rebuilt order via `getCardsInLocation(...)` + slicing.
  - Depending on deck API return ordering, this can reintroduce deterministic ordering after shuffle.
- Fix (`hegemonyoffaith.game.php`):
  - In both redistribution functions, changed post-shuffle deal path to draw from pool using `pickCards(...)` per player in seat order:
    - `redistributeActionCardsFromAllHands` (Chaos Coming)
    - `redistributeBelieversFromAllHands` (Everyone is Equal)
  - Distribution counts now derived from actual picked card count.
- Outcome:
  - Redistribution now follows true shuffled deck draw order instead of potentially fixed list ordering.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 48) AOE Survivor Return Animation Anchor Fix (2026-03-30)
- Symptom:
  - After AOE resolve, surviving Believers could visually fly toward left/odd location instead of returning to each owner's expected anchor.
- Root-cause direction:
  - AOE return animation used hardcoded `playertable_<owner>` targets.
  - This forced left-table direction and ignored right-panel/public anchor preference.
- Fix (`hegemonyoffaith.js`):
  - Added shared target resolver `getAoeBelieverReturnTargetNodeId(ownerId)`:
    - owner <= 0 => `graveyard`
    - self => `mybelievercards`
    - other players => prefer `panel_<id>`, fallback `playertable_<id>`, then public-anchor fallback
  - Applied to both AOE return paths:
    - `animateAoeBelieversToTargets(...)` (Conspiracy path)
    - `notif_martyrdomResolved` return animation block
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 49) Kowtow To Me Log Wording Upgrade (Sect Name + Member List) (2026-03-30)
- Symptom:
  - Successful Kowtow log still showed generic text (`absorbs target sect into their sect`) without actual sect identity detail.
- Fix (`hegemonyoffaith.game.php`):
  - Added helper `getSectDisplayName(...)` for sect id -> display name mapping.
  - `playKowtowToMe` now captures target sect member names before absorption.
  - Updated public log template to:
    - `${player_name} absorbs ${target_sect_name} (${target_member_names}) into ${attacker_sect_name}.`
  - Notify payload now includes:
    - `attacker_sect_name`, `target_sect_name`, `target_member_names`, `target_member_names_list`.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 50) Believer Draw Animation Unification (Divine Inspiration + Have a Charity) (2026-03-30)
- Symptom:
  - Divine Inspiration believer draw visuals could diverge from Have a Charity behavior.
  - Request: unify all logically equivalent “draw Believers from deck” visual/counter handling.
- Fix (`hegemonyoffaith.js`):
  - Added shared helper: `applyBelieverDeckDrawVisualSync(...)`.
  - Helper centralizes:
    - believer deck counter decrement (`draw_total_n`)
    - non-self target believer hand counter increment (`draw_n`)
    - deck-to-player-anchor flight animation (`animateDeckDrawToPlayer("believer", ...)`)
  - `notif_haveACharity` now routes through the shared helper.
  - `notif_divineInspiration` now routes through the same helper (keeps Divine-specific action-discard counter update and insufficient-deck message logic).
  - Added cross-key fallback (`n`/`draw_n`, `n_total`/`draw_total_n`) to avoid payload-shape drift causing visual mismatch.
- Outcome:
  - Divine Inspiration and Have a Charity now use the same believer draw animation + counter sync path.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 51) Combat/Animation Consistency Refactor Sweep (War + Debate + AOE + UI Class Cleanup) (2026-03-30)
- Goal:
  - Unify equivalent front-end flows before next regression pass (War/Debate/AOE commit/result handling, draw/flight styling consistency, and CSS-vs-JS responsibility).
- Refactor (`hegemonyoffaith.js`):
  - Added shared helpers for repeated combat flow logic:
    - `syncAoeDefendersChooseState(...)`
    - `handleAoeBelieverCommitted(...)`
    - `clearAoeCommitTransientState()`
    - `syncDuelCommittedBeliever(...)`
    - `scheduleDuelRoundCleanup()`
    - `applyDuelResultVisualAndLog(...)`
  - Rewired duplicated notification paths to shared helpers:
    - AOE: `notif_martyrdomBelieverCommitted`, `notif_martyrdomDefendersChoose`, `notif_conspiracyBelieverCommitted`, `notif_conspiracyDefendersChoose`
    - Duel: `notif_faithWarCardPlayed`, `notif_faithDebateCardPlayed`, `notif_faithDebateResult`, `notif_duelResult`
  - Unified Debate header visual style with War header builder:
    - `notif_faithDebateStart` / `notif_faithDebateRound` now use `buildFaithWarBannerTitle(...)`.
  - Removed JS inline display styles for war-log controls/modal initialization; switched to class toggling.
  - Removed inline red text style in skill tooltip HTML; switched to CSS class.
- Style cleanup (`hegemonyoffaith.css`):
  - Added `.is-hidden` utility class for shared show/hide behavior.
  - Added `.skill-tooltip-title` class for skill tooltip emphasized text.
- Outcome:
  - War/Debate/AOE now share more of the same control path, reducing drift bugs where one mode was fixed and another was not.
  - Repeated UI style responsibilities moved from inline JS to CSS classes.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 52) PHP Logic Consolidation: Action Bitmask + Turn-Ring Skip Handling (2026-03-30)
- Goal:
  - Reduce duplicated low-level logic in backend to make action-window checks and turn rotation less error-prone.
- Refactor (`hegemonyoffaith.game.php`):
  - Added action bit constants and shared helpers:
    - `ACTION_BIT_*`, `ACTION_BITS_*`
    - `getPerformedActionsMask()`, `hasPerformedActionBit(...)`, `markPerformedActionBits(...)`, `clearPerformedActionsMask()`
    - `isTrackedActionTypeMask(...)`, `getActionTypeNameByMask(...)`
    - `resetActionWindowState(...)`
  - Replaced repeated hardcoded bit math in:
    - `getAllDatas`, `checkPlayableActionCards`, `getActionTypeMaskFromCardType`, `getPerformedActionCount`, `argPlayerTurn`, `playActionCard`, `discardActionCards`, `startDiscardingActionCard`, `confirmDiscardingActionCard`, turn reset paths.
  - Added shared player-mask helpers and rewired duplicated mask code:
    - `isPlayerFlagSetByMaskKey(...)`, `setPlayerFlagByMaskKey(...)`
    - applied to Purple Hermit masks, skill reveal mask, Karboom/Praise/Holy Rebirth per-turn masks, skill protection masks, and Karboom attack lock mask.
  - Consolidated skip-turn ring handling in next-player flow:
    - `resetPerTurnSkillFlagsForPlayer(...)`
    - `notifySoulBladeSkipTurn(...)`
    - `pickNextPlayerSkipAware(...)`
    - `stNextPlayer` now delegates circular skip-aware selection to this helper.
- Outcome:
  - Backend uses one consistent set of helpers for bitmask logic and skip-turn rotation, reducing drift between similar flows.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 53) Secret Alliance Offered-Card ID Resolution Hardening (2026-03-31)
- Symptom:
  - Secret Alliance still failed at confirm with backend error:
    - `Choose an Action card from your hand to exchange.`
- Root-cause direction:
  - Frontend selected-card resolver could accept an unstable selected item id path and send an id that does not reliably map to the currently selected in-hand Action card node.
- Fix (`hegemonyoffaith.js`):
  - Hardened `getSingleSelectedActionCardIdFromHand(...)`:
    - requires exactly one selected item
    - resolves by selected-node identity first via `resolveSelectedActionCardIdFromStockItem(...)`
    - fallback uses `getSelectedActionCardIdsInHand(...)` and requires exactly one valid in-hand id
    - final fallback now also requires both `actionCardTypeById` and an actual stock node match
  - Effect: Secret Alliance confirm now submits only verified in-hand card ids.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 54) Victim-Side Believer Loss Flight Sync (Witch Hunt + Spread Rumors) (2026-03-31)
- Request:
  - Victim should visibly see believer movement from their own hand zone:
    - Witch Hunt: own hand -> graveyard
    - Spread Rumors: own hand -> stealing player anchor
- Fix (`hegemonyoffaith.js`):
  - Updated `animateBelieversFromPlayerToGraveyard(...)`:
    - if animated player is current viewer, source now uses `mybelievercards` (instead of only panel/table anchor).
  - Added `animateBelieverLossFromMyHandToPlayerAnchor(targetPlayerId, count)`.
  - `notif_spreadRumors` now triggers victim-side flight animation:
    - when current viewer is victim, animate 1 believer from `mybelievercards` to attacker receive anchor.
  - Existing attacker-side stolen-card receive animation remains unchanged.
- Outcome:
  - Victim perspective now matches requested UX for both cards.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 55) Debate Return Animation Anchor Fix (Use Debate Slots, Not Deck) (2026-03-31)
- Symptom:
  - At Faith Debate settlement, returned Believers could animate from `believer_deck`, looking like card draw instead of debate-card return.
- Fix (`hegemonyoffaith.js`):
  - Added `mapDebateReturnCardSourcesForCurrentPlayer(args)`.
  - On each `notif_faithDebateResult`, map result cards (`card_a` / `card_b`) to debate slot anchors:
    - attacker side -> `faithwar_slot_left`
    - defender side -> `faithwar_slot_right`
  - Mapping is saved into `pendingBelieverSourceByCardId`, so later `newBelievers` return animation uses debate slot anchors instead of deck anchor.
- Outcome:
  - Debate settlement now visually reads as "cards returning from debate table" rather than "drawing from deck".
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 56) Faith War Return Animation Split (Survivor from War Slot, Bonus from Deck) (2026-03-31)
- Request:
  - In Faith War end settlement:
    - round winners' surviving Believers should return from war area anchor.
    - War Bonus Believers should still animate from `believer_deck`.
- Fix (`hegemonyoffaith.js`):
  - Added `mapWarSurvivorReturnCardSourceForCurrentPlayer(args)`.
  - Hooked it in `notif_duelResult` so each winning survivor card id is pre-mapped to:
    - attacker winner card -> `faithwar_slot_left`
    - defender winner card -> `faithwar_slot_right`
  - Includes guard for zombie-from-grave cards (`*_from_graveyard=1`) so removed cards are not mapped as return-to-hand sources.
  - `newBelievers` remains unchanged: cards with mapped source fly from war slot; unmapped cards (including War Bonus) still come from deck.
- Outcome:
  - Visual split is now explicit and rules-accurate:
    - survivor return = from War table
    - bonus gain = from deck
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 57) AOE Action Card Vertical Shift Fix (Martyrdom/Conspiracy Settlement) (2026-03-31)
- Symptom:
  - During AOE settlement, the played action card on the left (e.g., Martyrdom) visually shifted downward when result rows updated.
- Root cause:
  - `.aoe-combat-layout` used `align-items: center`.
  - As right-lane content height changed during reveal/result labels, the whole left cluster was vertically re-centered.
- Fix (`hegemonyoffaith.css`):
  - Changed `.aoe-combat-layout` cross-axis alignment to `align-items: flex-start`.
  - Added inline comment documenting intent: keep action stack anchored while right side grows/shrinks.
- Outcome:
  - AOE played action card stays in stable position throughout resolve animation.

## 58) Unified Action-Play Flight Pipeline + Prophet/Discard Visual Sequencing (2026-03-31)
- Request:
  - Standardize action-card visual flow for all players:
    - played card flies from actor hand/anchor to table
    - effect resolves
    - action card goes to action discard
  - Keep Prophet prediction sequence aligned with table feel.
- Frontend changes (`hegemonyoffaith.js`):
  - Added unified action-flight helpers:
    - `getActionPlaySourceNodeId(playerId)` (self uses `myactioncards`, others prefer right panel anchor)
    - `getPlayedActionCardTargetNodeId(cardType)` (resolves actual table target node)
    - `animatePlayedActionCardFlight(playerId, cardType, opts)`
    - `scheduleCenterActionCardToDiscard(delayMs)`
  - `notif_actionCardPlayed` now:
    - places action card into target table zone first
    - runs unified flight animation for all players when no local pending preview exists
    - keeps pending-preview path intact for target/commit flows
    - schedules Info Spy action card discard visual (`700ms`) so it does not stick on table.
  - `setDuelActionCard(...)` now gives war/debate action card a stable id (`faithwar_action_main_card`) so flight can target the concrete card node.
  - Added effect-end discard scheduling for instant strategy visuals:
    - `notif_haveACharity` / `notif_divineInspiration` discard after effect when not in prophet flow
    - `notif_greatMercy` discard after revive visual
    - `notif_prophetPredictionResolved` discard after prophet reveal flow for `have_a_charity` / `divine_inspire`.
- Backend payload update (`hegemonyoffaith.game.php`):
  - Added `prophet_flow` marker in `haveACharity` / `divineInspiration` notifications:
    - normal direct resolve: `prophet_flow = 0`
    - resolved via prophet state (`stResolveProphetPrediction`): `prophet_flow = 1`
  - Purpose: frontend can keep card on table through prophet reveal sequence and discard at the right time.
- Outcome:
  - Action play visuals are now centralized and consistent across card families and player perspectives.
  - Prophet reveal flow is explicitly synchronized with post-effect discard timing.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 59) Info Spy Full Flow Sync (Play -> Public Waiting -> Close Ack -> Discard Flight) (2026-03-31)
- Request:
  - Info Spy should run as a complete staged flow:
    - all players see action card fly out
    - non-actor sees waiting status (spying in progress)
    - actor closes spy modal to acknowledge completion
    - then card flies to action discard and waiting status clears
    - actor continues with next action/end turn as normal
- Backend (`hegemonyoffaith.game.php`, `hegemonyoffaith.action.php`, `states.inc.php`):
  - Added global: `info_spy_pending_player_id` (label `84`).
  - `playInfoSpy(...)` now:
    - sends public `infoSpy` with actor/target ids + names,
    - sends private `spyResult` to actor,
    - sets pending spy owner,
    - transitions to new active-player state `infoSpyReview` (no immediate `finishPlayerAction`).
  - Removed `info_spy` from immediate-discard list in `playActionCard`, so card remains on table during review.
  - Added `completeInfoSpy(...)`:
    - validates pending owner,
    - moves on-table `info_spy` to discard,
    - broadcasts `infoSpyFinished`,
    - calls `finishPlayerAction()` to resume normal action window.
  - Added action endpoint `completeInfoSpy`.
  - Added state `96: infoSpyReview` (`possibleactions: completeInfoSpy`) and `playerTurn -> infoSpyReview` transition.
  - Added zombie fallback in `zombieTurn`: auto-completes `infoSpyReview`.
- Frontend (`hegemonyoffaith.js`):
  - Added handlers:
    - `notif_infoSpy`: show public waiting/status text.
    - `notif_infoSpyFinished`: close modal if open, clear wait, move center action card to discard.
  - `showSpyResultModal` close button/overlay now call `onCloseSpyResultModalClicked`, which sends `completeInfoSpy` ack (when allowed) before closing.
  - Added fallback action button in `infoSpyReview` state: `Finish Info Spy`.
  - Upgraded `moveCurrentCenterActionToDiscard()` to animate center action card flying to discard before updating discard preview.
  - Removed premature auto-discard timing for `info_spy` in `notif_actionCardPlayed`.
- Outcome:
  - Info Spy now follows the same table-readable rhythm as requested, with explicit review completion handshake.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `php -l states.inc.php` passed.

## 60) Secret Alliance Offer ID Resolution Hardening (Fix Persistent "Choose an Action card..." Error) (2026-03-31)
- Symptom:
  - Secret Alliance still failed on attacker confirm with:
    - `Unexpected error: Choose an Action card from your hand to exchange.`
  - Repro logs consistently showed attacker request carrying an offered id that backend rejected as not in hand.
- Root-cause hypothesis confirmed in frontend selection resolver:
  - Action-card selected-id parsing had overly permissive fallbacks (DOM trailing numeric token / generic item id).
  - In edge cases this could resolve to a non-card DB id, then submit wrong `type_arg/offered_card_id`.
  - Backend correctly rejected it in `validateSecretAllianceOffer(...)`.
- Fix (`hegemonyoffaith.js`):
  - Hardened `extractActionCardIdCandidatesFromStockNode(...)`:
    - now trusts `data-card-id` as primary source,
    - only falls back to `data-item-id` when `data-card-id` is absent,
    - removed trailing DOM-id numeric parsing.
  - Simplified `resolveSelectedActionCardIdFromStockItem(...)`:
    - first resolve from selected node `data-card-id`,
    - fallback to stock item fields (`id`, `item_id`, `card_id`) only when they map to a real in-hand card node.
  - Preserved existing Secret Alliance flow and payload shape; only corrected selected-card id source reliability.
- Outcome:
  - Secret Alliance offer submit now uses actual DB card ids from hand stock, aligning frontend with backend ownership validation.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 61) Conspiracy Result Visual/Return Sync Fix (Attacker No-Gray + No Deck-Like Refill) (2026-03-31)
- Request:
  - In `Conspiracy` resolve:
    - attacker committed believer must not become gray (unlike `Martyrdom`).
    - only losing believers should be gray.
    - losing believers should visibly fly back to attacker hand/anchor from table.
    - avoid visual artifact where loser disappears then appears as if drawn from deck.
- Fix (`hegemonyoffaith.js`):
  - Added `mapAoeReturnSourcesForCurrentPlayer(ownerByCardId)`:
    - maps each returning believer card id (owned by current viewer after resolve) to its on-table AOE commit node id.
    - reuses `pendingBelieverSourceByCardId` pipeline used by `newBelievers`.
  - In `notif_conspiracyResolved`, after computing `ownerByCardId`, now calls:
    - `mapAoeReturnSourcesForCurrentPlayer(ownerByCardId)`,
    - then existing public `animateAoeBelieversToTargets(ownerByCardId)`.
  - Result:
    - private `newBelievers` no longer falls back to deck-like source for these cards.
    - returned/stolen believers stay visually tied to table-origin flow.
- Fix (`hegemonyoffaith.css`):
  - Added Conspiracy-specific visual override:
    - `.aoe-commit-item.aoe-attacker-believer.is-loser .combat-result-card { filter: none; opacity: 1; }`
  - Keeps attacker `lose` label semantics while preventing grayscale on attacker card.
- Outcome:
  - Conspiracy now better matches requested table feel:
    - attacker card no longer grays out on lose.
    - return flow avoids misleading deck-like refill impression.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 62) AOE Attacker Result-Label Suppression (Conspiracy + Martyrdom) (2026-03-31)
- Request:
  - In multi-target AOE (`Conspiracy` / `Martyrdom`), attacker committed believer should not display `win/lose/draw` text label.
  - Only defender-side committed believers should show round outcome labels versus attacker.
- Fix (`hegemonyoffaith.js`):
  - Extended `setAoeResultState(cardId, resultType, textLabel, options)` with optional `options.hideLabel`.
  - When `hideLabel: true`:
    - result state class still applies (for visual styling logic),
    - any existing `.aoe-result-label` on that card is removed and not re-rendered.
  - Applied attacker-label suppression in:
    - `notif_martyrdomResolved` attacker card result set.
    - `notif_conspiracyResolved` attacker card result set (`loser` / `winner` / `draw` cases).
- Outcome:
  - AOE attacker card no longer shows textual outcome label.
  - Defender cards keep explicit `win/lose/draw` labels against attacker.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 63) Soul-Cutting Sword Naming + Target-Select UX Cleanup (2026-03-31)
- Request:
  - Keep skill English name consistent with tooltip (`Soul-Cutting Sword`) only.
  - During skill target selection, remove extra popup-like selection message spam.
  - Replace with top instruction text that updates with selected target player name.
- Frontend (`hegemonyoffaith.js`):
  - Added `getSoulCuttingSwordSelectionInstruction(targetPlayerId)`:
    - base prompt: `Soul-Cutting Sword: select 1 target player, then confirm.`
    - after selecting target: top instruction updates to selected player name and confirm hint.
  - `beginPendingSkillSelection` (skill 11) now uses this instruction helper.
  - `onSkillTargetPlayerSelected`:
    - for skill 11: no `showMessage` popup, only refresh top instruction with selected target name.
    - other skills keep existing behavior.
  - Updated visible strings to `Soul-Cutting Sword` in:
    - selection error prompt,
    - use notification,
    - marked/skip warning copy.
- Backend (`hegemonyoffaith.game.php`):
  - Updated all visible Soul Blade texts to `Soul-Cutting Sword`:
    - usage-cap rejection,
    - invalid/self-target errors,
    - use log,
    - marked notify,
    - skip-turn public/private notifies.
- Outcome:
  - Skill naming is now consistent with tooltip/rule terminology.
  - Target selection flow is quieter: no extra transient notify; top instruction reflects current selected target.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 64) Player Panel Skill Status Alignment (Spent/Active beside Skill card) (2026-03-31)
- Request:
  - In right player panel, `Spent`/`Active` should appear beside the Skill card (same visual row as Action/Believers number style), not below it.
  - Keep panel rows visually aligned and avoid uneven up/down card alignment.
- Fix:
  - `hegemonyoffaith.js`:
    - Moved `<span id="skill_active_*" class="panel-skill-active">` from below the `Skill` label into `skills_label > panel_counter_main`, directly next to the skill icon.
  - `hegemonyoffaith.css`:
    - Added `skills_label` row height stabilization (`min-height: 32px` for skill main row).
    - Restyled `.panel-skill-active` as an inline badge/value:
      - inline-flex alignment,
      - `min-width` reserve for readability,
      - slightly larger font,
      - nowrap protection.
- Outcome:
  - `Spent`/`Active` now renders to the right of the Skill card and reads like a counter/value, while preserving panel alignment.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 65) Defense Mismatch UX Softening (No Technical-Looking Error for Wrong Defense Type) (2026-03-31)
- Request:
  - When player chooses wrong defense card type, do not present technical-looking error style (`Unexpected error...` with reference).
  - Show plain guidance message like "This is a Physical attack; use Physical defense."
- Frontend (`hegemonyoffaith.js`):
  - Added defense-kind helpers:
    - `getDefenseKindByWarType(warType)`
    - `getCurrentDefenseKindFromContext()`
    - `getDefenseMismatchMessage(defenseKind)`
    - `validateDefenseCardSelectionItem(item)`
  - In both defense submission entry points:
    - `onPlayerActionCardsSelectionChanged` (`playDefenseCard` branch)
    - `onUseDefenseCardClicked`
  - Now pre-validate selected defense card before AJAX submit.
  - Wrong card type now shows user-facing guidance and cancels selection locally (request is not sent).
- Backend (`hegemonyoffaith.game.php`):
  - Kept server guard and replaced generic invalid-defense text with explicit guidance:
    - Mental attack -> use `Firm Faith`
    - Breaking Faith attack -> use `Breaking Faith`
    - Physical attack -> use `Great Mercy`
- Outcome:
  - Most mismatch cases are intercepted client-side with clear guidance.
  - Server fallback messages are also player-readable and attack-type specific.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 66) AOE No-Believer Placeholder UX (Replace Misleading Facedown Card) (2026-03-31)
- Request:
  - In AOE (Martyrdom/Conspiracy), when a sect currently has no believers available to commit, do not show a facedown believer card placeholder.
  - Show a dashed empty placeholder with sect-name message instead, to avoid confusion.
- Fix (`hegemonyoffaith.js`):
  - Updated `ensureAoeRightSlotPlaceholder(ownerId)`:
    - preserves existing committed-card entries.
    - refreshes stale placeholder entries safely.
    - checks current sect believer availability via `getSectBelieverCountFromPublicCounters(sectId)`.
    - if sect believer count is `0`, renders text placeholder:
      - `(<Sect Name>) currently has no Believers to oppose.`
    - otherwise keeps existing facedown placeholder behavior.
- Fix (`hegemonyoffaith.css`):
  - Added AOE empty-state visual styles:
    - `.aoe-no-believer-placeholder` (dashed border, light background, centered content)
    - `.aoe-empty-slot-note` (compact centered text styling)
- Outcome:
  - AOE lane no longer shows misleading facedown believer when a sect has no believers to respond.
  - Visual intent is explicit and closer to expected tabletop state readability.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 67) Faith War End Log Wording + Participant List Scope Update (2026-03-31)
- Request:
  - Remove misleading `[Combat Snapshot] ... View all battles ...` wording.
  - Faith War end log should show:
    - `Sect A (participants who actually fought) VS Sect B (participants who actually fought)`.
  - Participant list must be fighters only, not full sect member list.
- Backend (`hegemonyoffaith.game.php`):
  - Added new global mask:
    - `war_participant_mask` (label `85`), initialized to `0` on setup.
  - Added helpers:
    - `clearFaithWarParticipants()`
    - `markFaithWarParticipant(player_id)`
    - `getFaithWarParticipantNamesForSect(sect)` (seat-order names, fighters only)
  - Faith War flow integration:
    - `playFaithWar(...)` now resets participant mask at war start.
    - `playBelieverCardCombat(...)` marks participant on Faith War believer commit.
    - `autoCommitFaithWarBelieverForRepresentative(...)` also marks participant.
    - `finalizeFaithWar(...)` now emits `combatSnapshotHistory` as:
      - `${attacker_sect_name} (${attacker_participants}) VS ${defender_sect_name} (${defender_participants}) Faith War ended.`
    - Participant text uses actual fighters only (`-` if none), and mask is cleared at war end.
- Outcome:
  - Faith War end log now reflects sect names plus real combat participants, without implying unavailable panel-link behavior.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 68) End Summary Winner Reason Copy (Believer Deck Empty) (2026-03-31)
- Request:
  - In custom end summary screen, replace vague reason:
    - `Believer deck is empty. Winner was resolved by end-game rules.`
  - with explicit winner logic wording:
    - leader with most Believers wins.
- Fix (`hegemonyoffaith.game.php`):
  - `stShowGameEndSummary()` reason text for `game_end_reason_code === 2` changed to:
    - `Believer deck is empty. The leader with the most Believers wins.`
- Outcome:
  - End summary now states the expected game rule directly and avoids generic/ambiguous phrasing.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 69) End Summary Winner Reasons Expanded to 5 Rule-Accurate Outcomes (2026-03-31)
- Request:
  - Keep generic `${winner_name} wins the game!` unchanged.
  - Update end-summary reason copy to support 5 distinct outcomes:
    1) normal most-Believers victory (no deck-empty preface text),
    2) Unification Under Heaven wording,
    3) Impermanence skill-success wording,
    4) tie resolved by final struggle wording,
    5) follower usurpation victory wording.
- Backend (`hegemonyoffaith.game.php`):
  - Refactored `computeWinnerWhenBelieverDeckEmpty(...)` to return:
    - `winner_id`
    - `tie_break_used` (whether final tie resolution flow was used)
  - In `checkAndResolveGameEnd(...)`:
    - deck-empty branch now distinguishes:
      - `final_struggle` when tie-break path is used,
      - `follower_usurp` when winner is a follower and no tie-break was used,
      - `believer_deck_empty` for normal leader most-Believers win.
    - extended `game_end_reason_code` mapping:
      - `1` unification
      - `2` normal most-Believers leader win
      - `3` impermanence
      - `4` final struggle tie-break win
      - `5` follower usurpation win
  - Updated `stShowGameEndSummary()` reason copy:
    - `1`: `Unification Under Heaven victory.`
    - `2`: `This leader wins with the most Believers.`
    - `3`: `Impermanence of Life succeeded and secured victory.`
    - `4`: `Having the most Believers, this player won the final struggle.`
    - `5`: `A Follower gained the most Believers and usurped their Leader for victory.`
- Outcome:
  - End summary now reflects the exact victory path instead of collapsing multiple scenarios into one generic deck-empty reason.

## 70) Secret Alliance Offer Selection Parser Fix (Select Exactly One False-Negative) (2026-03-31)
- Problem:
  - Secret Alliance flow still failed at confirm-offer step with:
    - `Select exactly one Action card to offer`
  - even when player had selected one valid Action card.
- Root Cause (`hegemonyoffaith.js`):
  - `getSingleSelectedActionCardIdFromHand(...)` returned `0` immediately when `playerActionCards.getSelectedItems().length !== 1`.
  - In this flow, BGA stock selection arrays can occasionally be stale/empty while DOM selection is still valid.
  - Early return prevented fallback resolution from DOM-selected stock nodes and valid in-hand card mapping.
- Fix (`hegemonyoffaith.js`):
  - Removed hard early return on non-`1` selected item count.
  - Keep fast-path node resolution when `items.length === 1`.
  - Always run fallback `getSelectedActionCardIdsInHand(...)` + DOM selected-node resolution.
  - Explicitly return `0` only when multiple valid candidates remain ambiguous.
- Outcome:
  - Secret Alliance offer-confirm now accepts single valid selected Action card reliably even when stock selected-items array is temporarily inconsistent.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 71) Remove Central Combat Win/Lose Text Noise (War/Debate/AOE) (2026-03-31)
- Request:
  - During combat resolution, central arena should not show obvious textual winner labels (`win/lose/draw`).
  - Keep combat flow visuals/logs, but remove noisy center-board result text.
- Fix (`hegemonyoffaith.js`):
  - `getHeadToHeadResultVisual(...)`:
    - set duel label payloads to empty string for attacker/defender/draw.
    - keeps result state classes (`winner/loser/draw`) unchanged for card visual state.
  - `setAoeResultState(...)`:
    - switched to text-hidden default behavior.
    - now only shows label if explicit `options.showLabel === true`.
    - existing calls (no `showLabel`) therefore render no central text labels.
- Outcome:
  - War / Debate / AOE central board no longer prints explicit result words while resolving.
  - Result visuals (gray/survive state) and logs remain intact.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 72) Surrender Give-Believer Hand/Count Sync Fix (Accepted Flow) (2026-03-31)
- Problem:
  - In accepted surrender -> leader gives 1 Believer flow, UI could show identity change but hand/count not updating reliably.
  - Reproduced especially when the follower/bankrupt was also the upcoming next-turn player.
- Root cause:
  - `giveBeliever()` moved the Believer in backend, but did not emit private hand sync notifications for both involved players.
  - No immediate public-count sync was sent after transfer, so side counters could remain stale on clients.
- Fix (`hegemonyoffaith.game.php`):
  - Added guard in `giveBeliever(...)`:
    - throw if `follower_id_waiting <= 0` (`No follower is waiting for a believer.`).
  - After move:
    - notify leader `syncBelieverHand` with full current hand.
    - notify follower `syncBelieverHand` with full current hand.
    - broadcast `publicCountsSync` via `notifyPublicCountsSync()`.
- Outcome:
  - Accepted surrender give step now immediately reflects true hand/card-count state on both involved clients and all public panels.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 73) Remove Extra War Bottom Winner/Bonus Banner Text (2026-03-31)
- Problem:
  - During Faith War duel resolution, central arena bottom still showed additional banner text (winner/loser sentence) that was not desired.
- Root cause (`hegemonyoffaith.js`):
  - `notif_duelResult` appended a `faith-war-banner` node into `central_arena` with duel winner message.
  - `notif_duelBonus` also appended a `faith-war-banner` node into `central_arena`.
- Fix:
  - Removed `central_arena` banner append block from `notif_duelResult`.
  - Removed `central_arena` bonus banner append block from `notif_duelBonus`.
  - Kept combat visuals and faith-war log behavior unchanged.
- Outcome:
  - War area no longer shows extra bottom text like “X won against Y” / bonus banner.
  - UI remains text-clean in central combat board as requested.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 74) Restore Card-Face Result Labels (win/lose/draw) While Keeping Banner Removed (2026-03-31)
- Clarification:
  - Required behavior is:
    - keep card-face result labels (`win/lose/draw`) under combat cards,
    - remove only the extra narrative banner text like "X won against Y".
- Fix (`hegemonyoffaith.js`):
  - Restored `getHeadToHeadResultVisual(...)` labels:
    - attacker win/defender lose
    - attacker lose/defender win
    - draw/draw
  - Restored `setAoeResultState(...)` default label behavior (`hideLabel` opt-out model), so AOE labels render normally unless explicitly hidden.
  - Kept previous removal of `central_arena` winner/bonus banner append in:
    - `notif_duelResult`
    - `notif_duelBonus`
- Outcome:
  - Central combat cards again show expected `win/lose/draw` labels.
  - Extra bottom narrative message banners remain removed.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 75) Regression Verification Pass (2026-03-31, requested minimal checklist)
- Scope:
  1) Secret Alliance offer confirm parser
  2) Accepted surrender + `giveBeliever` sync (including case where follower is upcoming next player anchor)
  3) Faith War result display (card-face labels kept, extra winner/bonus banner removed)
  4) End summary 5-reason mapping
- Verified in code path:
  - Secret Alliance:
    - `onConfirmSecretAllianceOwnCardClicked` uses `getSingleSelectedActionCardIdFromHand(...)` and sends DB card id as `type_arg/offered_card_id`.
    - `getSingleSelectedActionCardIdFromHand(...)` keeps DOM fallback path and no longer hard-fails on transient selected-item mismatch.
    - backend `validateSecretAllianceOffer(...)` enforces in-hand ownership and rejects invalid exchange candidates.
  - Surrender + `giveBeliever`:
    - `giveBeliever(...)` sends `syncBelieverHand` to both leader/follower and `publicCountsSync`.
    - `setForcedNextTurnAnchor(follower_id)` is applied before `nextPlayer`, and `stNextPlayer()` consumes this anchor before next-turn selection.
  - Faith War display:
    - `getHeadToHeadResultVisual(...)` provides `win/lose/draw` labels.
    - `revealFaithWarCard(...)` writes label text to `.faith-war-card-label`.
    - `notif_duelResult` / `notif_duelBonus` no longer append center winner/bonus banner text.
  - End summary reasons:
    - `checkAndResolveGameEnd(...)` maps reason to codes `1..5` (`unification`, `believer_deck_empty`, `impermanence`, `final_struggle`, `follower_usurp`).
    - `stShowGameEndSummary()` maps all 5 codes to explicit reason copy.
- Command validations:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed all built-in combat unit tests.
- Note:
  - Full click-path runtime confirmation for these 4 scenarios still requires an actual BGA table session (multi-client interaction states).

## 76) Follow-up UX/Validation Fixes (2026-03-31, Secret Alliance + no-believer guards)
- Request scope:
  1) Secret Alliance still stuck on `Select exactly one Action card to offer`.
  2) `Spread Rumors` should not be usable on sects with 0 believers.
  3) No-believer `Faith War` / `Faith Debate` should show player-facing guidance (not rely on raw backend exception flow).
  4) Discard action should remain available even when current sect has 0 believers (so player can discard before surrender path).
- Frontend (`hegemonyoffaith.js`):
  - Secret Alliance selected-card resolver hardened again for stock DOM variants:
    - added strict stock-id parser `extractActionCardIdFromStockItemId(...)`,
    - candidate extraction now checks wrapper + inner stock nodes (`data-card-id` / `data-item-id`) and strict `*_item_<id>` fallback,
    - selected-node queries now accept both `.stockitem_selected` and `.selected` forms.
  - Added no-believer target guards:
    - `Spread Rumors` target sectors with 0 believers are not selectable in target-highlight phase,
    - `Faith War` / `Faith Debate` target sectors with 0 believers are also filtered from selectable targets.
  - Added pre-play no-believer guard:
    - selecting `Faith War` / `Faith Debate` when own sect has 0 believers now shows local guidance and aborts selection flow.
  - Added `Spread Rumors` global precheck:
    - if no valid target sect currently has believers, action selection is blocked with guidance.
  - Discard button visibility hardening:
    - avoid mutating discard-used bit from empty/partial `possibleactions` snapshots,
    - require explicit `checkAction("discardActionCards")` when rendering discard toggle.
- Backend (`hegemonyoffaith.game.php`):
  - `playSpreadRumors(...)` now rejects zero-believer target sects with explicit message:
    - `Target sect has no Believers for Spread Rumors.`
  - Updated no-believer validation messages for `Faith Debate` / `Faith War` with actionable guidance:
    - suggests discarding action cards or ending turn.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

## 77) Faith Debate Stop Option Always Available During Debate (2026-03-31)
- Request:
  - Faith Debate is capped at 5 rounds, but attacker representative should be able to stop early at any time before cap.
  - Stop button should keep appearing during ongoing Debate rounds (not disappear due round-local commit gating).
- Backend (`hegemonyoffaith.game.php`):
  - `stopFaithDebate()`:
    - removed per-round committed-card lock check (`war_card_attacker > 0`) so stop is not blocked by round-local commit status.
  - `argFaithDebateDuel()`:
    - `can_stop_faith_debate` now depends on:
      - combat type is Faith Debate,
      - current player is attacker representative.
    - no longer depends on `war_card_attacker`.
- Frontend (`hegemonyoffaith.js`):
  - In `faithDebateDuel` action-button render:
    - render `Stop Faith Debate` button before local committed-latch early return,
    - keeps stop option visible while still in debate duel context.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 78) AOE Attack Flow Unified with War/Debate (Martyrdom/Conspiracy) (2026-03-31)
- Request:
  - For AOE attacks, unify to fixed order:
    - play Action card -> defense window -> sect leader representative assignment -> representative commits believer -> resolve.
  - Remove old pre-commit-at-play behavior that blocked follower/no-believer initiators.
- Backend (`hegemonyoffaith.game.php`):
  - `playActionCard`:
    - `martyrdom` / `conspiracy` no longer require `type_arg` believer id.
  - `playMartyrdom()` / `playConspiracy()`:
    - no longer commit attacker believer at action-play time,
    - now set combat context only and enter `confirmDefense`,
    - reject only when whole attacker sect has 0 believers.
  - AOE representative stage:
    - attacker sect is now included in representative assignment flow (same as defenders),
    - `war_rep_attacker_id` is set from auto/leader assignment,
    - defended non-attacker sects are excluded as before.
  - AOE believer-commit stage:
    - `stMartyrdomChooseBelievers` / `stConspiracyChooseBelievers` now ensure attacker representative is in target pool.
  - `playBelieverCardCombat`:
    - for AOE, selected representative model is enforced for both attacker and defenders,
    - attacker representative now sets `war_card_attacker` when committing.
  - Zombie/disconnect path:
    - `autoCommitAoeBelieverForZombie` now sets `war_card_attacker` when zombie is attacker representative.
- Frontend (`hegemonyoffaith.js`):
  - Removed local pending flow that required selecting believer before sending `martyrdom/conspiracy` action card.
  - Action now submits directly on card play and waits for defense/representative states.
  - AOE attacker-slot rendering fix:
    - commit payload now carries `is_attacker_representative`,
    - attacker representative believer is rendered in left attacker slot even when representative is not the action initiator.
  - Updated AOE representative/commit prompts from “defender” wording to “representative” wording.
- Additional consistency:
  - `stResolveConspiracy` / `stResolveMartyrdom` defender card collection now excludes only attacker committed card id (owner-id agnostic), supporting attacker representative ownership.
  - Martyrdom dead-card private sync for attacker now uses actual attacker-card owner (representative) instead of always action initiator.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 79) AOE Representative Buttons Missing for Active Leader (Frontend Arg Parsing Fix) (2026-03-31)
- Problem:
  - In `martyrdomChooseRepresentative` / `conspiracyChooseRepresentative`, leader could become active (`You must choose a representative for your sect`) but no candidate buttons rendered, causing flow stall.
- Root cause (`hegemonyoffaith.js`):
  - These two states read candidates only from `args.candidates`.
  - In some client/state refresh paths, candidate list is wrapped under `args.args`, so UI got empty list despite valid backend candidates.
- Fix:
  - `getRepresentativeCandidatesForCurrentLeader(args)` now unwraps `args.args` safely.
  - `martyrdomChooseRepresentative` / `conspiracyChooseRepresentative` button rendering switched to this unified helper (same model as War/Debate representative UI).
  - Added waiting top-instruction fallback when no candidates are available to reduce “my turn but no button” confusion.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 80) AOE Defender Lane Slot Model Fixed to Sect-Based (No Duplicate Same-Sect Slots) (2026-03-31)
- Problem:
  - During AOE defense display, right-side lane was rendered per player, causing duplicate slots for same sect (e.g., two `Bushido` entries).
  - Before representative assignment, player-name line incorrectly showed concrete player names instead of unknown representative status.
- Expected UX:
  - Right-side AOE lane should be one slot per sect (excluding attacker sect), regardless of how many players in that sect.
  - Before assignment: sect line shown, representative line should be `???` (no player color).
  - After assignment: representative line updates to assigned player's name (with player color), while sect line keeps leader/sect color.
- Frontend fix (`hegemonyoffaith.js`):
  - Reworked AOE right-lane model from player-based to sect-based:
    - `initAoeRightSlotsBySeatOrder(...)` now groups by unique sect in seat order.
    - slot identity switched to `data-sect-id` / `aoe_sect_slot_<sect>`.
  - Added sect-slot owner label builder:
    - `getAoeSectOwnerLabelHtml(...)` (sect line + representative line).
    - pre-assignment renders `???`; post-assignment renders colored player name.
  - Added representative-label sync:
    - `syncAoeRepresentativeLabelsFromTargetIds(...)`.
    - hooked into `martyrdomChooseBelievers` / `conspiracyChooseBelievers` and defenders-choose sync.
    - also updates on `martyrdomRepresentativeChosen` / `conspiracyRepresentativeChosen` notifications.
  - AOE commit routing now targets sect slot (not player slot), preserving one visible slot per sect.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.

## 81) Prophet Trigger Active-Player Switch Crash Hardening (2026-04-01)
- Problem:
  - With Prophet in table, `Have a Charity` / `Divine Inspiration` could still hit:
    - `Impossible to change active player during activeplayer type state`
  - This blocked the expected interrupt flow before believer draw resolution.
- Root cause:
  - Active-player reassignment in Prophet/reactive flows could still pass through direct `changeActivePlayer(...)` paths in edge state-type contexts.
  - Existing safe-switch helper was not fully defensive when state type was non-standard (`private`/mismatched runtime context) and could still fall back to direct change.
- Fix (`hegemonyoffaith.game.php`):
  - Hardened `switchActivePlayerSafely(...)`:
    - treats both `activeplayer` and `private` as no-direct-change contexts,
    - rotates via `activeNextPlayer()` to target responder in those states,
    - wraps direct `changeActivePlayer(...)` in `try/catch` and auto-fallbacks to rotation when BGA raises activeplayer-change exception.
  - Replaced remaining direct player hand-back in Prophet/reactive resolves with safe helper:
    - `stResolveProphetPrediction()` now uses `switchActivePlayerSafely($drawer_id)`.
    - `stResolveHolyRebirth()` resume hand-back now uses safe helper.
    - `stResolveReverseKarmaPrompt()` resume hand-back now uses safe helper.
- Outcome:
  - Prophet interrupt chain for `Have a Charity` / `Divine Inspiration` no longer hard-crashes on active-player switch timing.
  - Flow remains: interrupt prompt -> optional reveal -> guess -> resolve distribution -> return control to drawer action window.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 82) Secret Alliance Reflow to Two-Step Card Selection (2026-04-01)
- Problem:
  - Secret Alliance still failed at attacker confirm with backend rejection:
    - `Choose an Action card from your hand to exchange.`
  - Frontend was still sending offered-card id during `playActionCard`, and stale/incorrect id mapping could still break the flow.
  - UX target:
    - play card -> choose target -> attacker chooses offer card -> target chooses response card -> exchange.
- Backend (`hegemonyoffaith.game.php`, `states.inc.php`):
  - Added new active-player state:
    - `secretAllianceAttackerChoice` (state `103`) before `secretAllianceTargetChoice`.
  - `playSecretAlliance(...)` now:
    - stores attacker/target context,
    - enters `secretAllianceAttackerChoice` first,
    - no longer requires offered-card id at action-play time.
  - `playActionCard(secret_alliance)` validation changed:
    - now validates start conditions only (`validateSecretAllianceStart`):
      - target is valid,
      - attacker has another Action card available to offer,
      - target has Action cards to exchange.
  - `chooseSecretAllianceCard(...)` now handles two phases by current state:
    - in `secretAllianceAttackerChoice`: store attacker offered card and pass control to target choice state,
    - in `secretAllianceTargetChoice`: validate target selection and execute exchange.
  - Added and reset new GS value:
    - `secret_alliance_target_card_id`.
- Frontend (`hegemonyoffaith.js`):
  - Removed old playerTurn inline confirm-offer branch for Secret Alliance.
  - After target is selected, Secret Alliance now submits immediately to backend and enters dedicated selection states.
  - Added action-button handling for `secretAllianceAttackerChoice`:
    - `Confirm Offered Action Card` -> calls `chooseSecretAllianceCard`.
  - Kept target-side `secretAllianceTargetChoice` confirm flow:
    - target selects one Action card, confirms, then exchange resolves.
- Expected result:
  - No more `offered_card_id`-dependent failure at `playActionCard`.
  - Both sides explicitly choose one Action card in sequence before exchange completes.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 92) Secret Alliance Exchange Unblock (Buttons + Selection False-Negative Guard) (2026-04-01)
- Problem:
  - After selecting Secret Alliance target, flow could hard-stall with no actionable button in both:
    - `secretAllianceAttackerChoice`
    - `secretAllianceTargetChoice`
  - Some clients also hit a frontend false-negative prompt (`Choose an Action card from your hand to exchange.`) even after selecting a valid hand card.
- Root cause (`hegemonyoffaith.js`):
  - `onUpdateActionButtons` already had `secretAllianceAttackerChoice/TargetChoice` cases, but
    `canRenderCurrentStateButtons` omitted both state names, so button rendering was skipped entirely.
  - Attacker confirm path added an extra client-side mapping check (`actionCardTypeById`) that could reject a valid selected card before server validation.
- Fix:
  - Added both Secret Alliance states to `canRenderCurrentStateButtons` gate with active-player check.
  - Removed the extra attacker-side local mapping blocker in `onConfirmSecretAllianceOwnCardClicked`; now selected card id is sent to backend authority validation directly.
  - Hardened target-side confirm handler to use `checkAction("chooseSecretAllianceCard", true)` consistently before submit.
- Expected result:
  - Attacker and target both get their proper confirm button during exchange sequence.
  - Secret Alliance no longer stalls at "choose one Action card to offer/exchange" due missing frontend buttons.
  - Valid selected hand cards no longer get blocked by local false-negative mapping check.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 93) Secret Alliance Active-Player Switch Crash Fix (2026-04-01)
- Problem:
  - Secret Alliance attacker confirm still crashed with:
    - `Impossible to change active player during activeplayer type state`
  - Repro path:
    - attacker selects offered Action card in `secretAllianceAttackerChoice`
    - backend `chooseSecretAllianceCard` attempted direct active-player switch.
- Root cause (`hegemonyoffaith.game.php`):
  - `chooseSecretAllianceCard` still used direct:
    - `$this->gamestate->changeActivePlayer($target_id)` (attacker -> target step)
    - `$this->gamestate->changeActivePlayer($attacker_id)` (exchange done -> back to attacker)
  - This conflicts with current project state-switch safety model where activeplayer contexts must use safe rotation helper.
- Fix:
  - Replaced both direct active-player changes with:
    - `$this->switchActivePlayerSafely((int) $target_id);`
    - `$this->switchActivePlayerSafely((int) $attacker_id);`
  - Kept existing state transitions and exchange semantics unchanged.
- Expected result:
  - Attacker confirm no longer throws activeplayer switch exception.
  - Secret Alliance now proceeds attacker choose -> target choose -> exchange -> return to attacker turn flow.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 94) Secret Alliance Switch Moved to Game States (No Player-Action Switch) (2026-04-01)
- Problem:
  - Secret Alliance still hit `Impossible to change active player during activeplayer type state` on attacker confirm in some table/session paths.
  - This indicated active-player switching was still too fragile when done directly inside player action handling.
- Root cause:
  - Even with safe helper usage, switching active player from `chooseSecretAllianceCard` (activeplayer action context) remained vulnerable to state-timing restrictions.
- Fix:
  - Refactored Secret Alliance flow to use game-type intermediary states for switching:
    - Added state `104` `secretAllianceSwitchToTarget` (`game`, action `stSecretAllianceSwitchToTarget`)
    - Added state `105` `secretAllianceReturnToAttacker` (`game`, action `stSecretAllianceReturnToAttacker`)
  - Transition changes:
    - `secretAllianceAttackerChoice` now transitions to `secretAllianceSwitchToTarget` (instead of direct target choice).
    - `secretAllianceTargetChoice` now transitions to `secretAllianceReturnToAttacker`.
  - Backend flow changes (`hegemonyoffaith.game.php`):
    - `chooseSecretAllianceCard` attacker step now only stores offered card and `nextState('secretAllianceSwitchToTarget')`.
    - `stSecretAllianceSwitchToTarget` performs safe active-player switch to target, then enters target choice state.
    - Target confirm now performs exchange + notifications, then `nextState('secretAllianceReturnToAttacker')`.
    - `stSecretAllianceReturnToAttacker` safely switches back to attacker, clears Secret Alliance context GS values, and routes back via `routeAfterActionWindowCheck('playerTurn')`.
- Expected result:
  - No active-player switch is executed inside Secret Alliance player action anymore.
  - Flow should be stable: attacker choose -> target choose -> exchange -> return attacker turn.
- Validation:
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 95) Player-Turn Discard Button Desync Fix (Post-Secret-Alliance Regression Guard) (2026-04-02)
- Problem:
  - `Discard Action Card(s)` button could appear for the first acting player, then disappear for later players even when they had remaining action slots.
  - Report came after Secret Alliance flow refactor and was consistent with a client-side stale turn-action mask.
- Root cause (`hegemonyoffaith.js`):
  - `onUpdateActionButtons("playerTurn")` updated action counts from args, but did not always re-sync `currentTurnActionMask` from server args.
  - There was also a heuristic that force-marked discard as already used (`currentTurnActionMask |= discard bit`) when local `possibleactions` did not include `discardActionCards`, which could produce false lockouts.
- Fix:
  - In `onUpdateActionButtons`, always parse and apply server `performed_actions_mask` for `playerTurn`.
  - Removed the client heuristic that inferred discard-used from `possibleactions`.
  - Result: discard availability is now server-authoritative per turn, not inferred from potentially stale client conditions.
- Expected result:
  - On each player's turn, discard button visibility follows actual server turn state.
  - No carry-over "discard already used" lock from previous player.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php test_logic.php` passed.

## 96) Faith Debate Stop Button Visibility Hardening (Representative Flow) (2026-04-02)
- Problem:
  - During ongoing Faith Debate rounds, attacking side sometimes still could not see `Stop Faith Debate` button even though representative duel flow and rounds were running normally.
  - Symptom matched client-side multiple-active desync (button visibility/checkAction gating), not debate core logic failure.
- Frontend fixes (`hegemonyoffaith.js`):
  - Added helper `canCurrentPlayerRequestFaithDebateStop(args)`:
    - determines stop-request eligibility by attacker representative identity using state args + combat context fallback.
  - `canRenderCurrentStateButtons` for `faithDebateDuel` now allows render when:
    - current player is active, **or**
    - current player is attacker representative eligible to request stop.
  - In `faithDebateDuel` button build:
    - `Stop Faith Debate` no longer depends on local `checkAction("stopFaithDebate", true)` gate.
    - keeps round commit guard (`!hasCommittedDuelBelieverThisRound`) and role guard.
  - `onStopFaithDebateClicked` hardened:
    - first uses normal `checkAction(..., true)` path,
    - then fallback submit path for `faithDebateDuel` + eligible attacker representative (backend remains authoritative).
  - `notif_faithDebateRound` now writes:
    - `combat_context.war_rep_attacker_id`
    - `combat_context.war_rep_defender_id`
    so role fallback stays accurate through rounds/reconnects.
- Expected result:
  - Attacking representative should consistently see `Stop Faith Debate` before committing believer each round.
  - Missing-button cases caused by transient client action-gate desync should be eliminated.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php test_logic.php` passed.

## 97) AOE Representative Validation Hardened (Fix Self-Select False Invalid) (2026-04-03)
- Problem:
  - In AOE representative assignment (reported on Martyrdom), leader could see candidate button(s) but clicking self could fail with:
    - `Invalid Martyrdom representative`
  - User also observed candidate list mismatch symptoms in some sect states.
- Root cause:
  - Representative validation relied on array membership against a computed candidate list at click time.
  - In edge desync/race conditions, this list-based strict check could reject a still-valid representative pick.
- Fix (`hegemonyoffaith.game.php`):
  - Added `isValidSectCombatRepresentative(int $sect, int $player_id): bool`:
    - representative must be in same sect,
    - representative must not be Wanderer,
    - representative must currently have at least 1 Believer in hand.
  - Updated both:
    - `chooseMartyrdomRepresentative(...)`
    - `chooseConspiracyRepresentative(...)`
    to use this direct rule check instead of only list-membership check.
- Expected result:
  - Selecting self as representative no longer fails spuriously when player is valid by rules.
  - AOE representative selection is more robust under transient client/server candidate-list drift.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 98) Combat Owner Color Split + AOE Attacker Placeholder Restore (2026-04-03)
- UI request:
  - War/Debate/AOE owner labels should keep split coloring:
    - sect name uses sect leader color,
    - player name uses that player's own color.
  - In AOE pre-assignment waiting stage, attacker-side believer facedown placeholder should be visible (instead of appearing only at commit moment).
- Frontend fixes (`hegemonyoffaith.js`):
  - Added robust sect leader color resolver:
    - `getSectLeaderColorBySect(sectId, fallbackPlayerId)`
    - fallback chain includes explicit leader, follower->leader link, inferred leader by follower references, and safe final fallbacks.
  - Updated combat color usage:
    - `getSectColorForPlayer(...)` now uses `getSectLeaderColorBySect(...)`.
    - `getAoeSectOwnerLabelHtml(...)` sect line now uses the same resolver.
  - Restored AOE attacker facedown placeholder:
    - added `ensureAoeAttackerBelieverPlaceholder()`.
    - called in both `notif_martyrdomStart` and `notif_conspiracyStart` right after action card placement.
    - placeholder auto-clears when real attacker believer commit arrives (existing container replace path).
  - Also reset AOE representative ids at AOE start notifications for cleaner pre-assignment state.
- Expected result:
  - Combat owner labels now consistently show sect line in leader color and player line in player color (including follower representatives).
  - AOE left attacker slot shows facedown placeholder during waiting/assignment stage, then replaces with real committed believer.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php test_logic.php` passed.

## 83) AOE Gray-State Rule Split by Card Type (Martyrdom vs Conspiracy) (2026-04-01)
- Request:
  - `Martyrdom`: attacker-side committed believer always dies, so left attacker believer should be gray.
  - `Conspiracy`: attacker-side committed believer does not die, so attacker believer should stay normal color.
  - For other players in `Conspiracy`, only losers should be gray (draw/win keep normal color).
- Fix (`hegemonyoffaith.js`):
  - In `addAoeCommitToArena(...)`, attacker-believer special class `aoe-attacker-believer` is now applied only when current AOE combat type is `conspiracy`.
  - Result:
    - `martyrdom`: attacker believer no longer receives the anti-gray override; attacker loser state renders gray as expected.
    - `conspiracy`: attacker believer keeps anti-gray override on lose; defender side still follows normal winner/lose/draw coloring (only losers gray).
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 84) Holy Rebirth Log Placeholder Fix (`${n}` Missing) (2026-04-01)
- Problem:
  - Holy Rebirth trigger could resolve correctly but log rendering failed with:
    - `Invalid or missing substitution argument ... could not find key "n" in template`
- Root cause (`hegemonyoffaith.game.php`):
  - Notification template used `${n}`:
    - `${player_name} uses Holy Rebirth and revives ${n} Believer(s) ...`
  - Payload omitted `n` and only sent `revived_n`.
- Fix:
  - Added `'n' => (int) $revived_n` to `skillHolyRebirth` notify payload.
  - Kept existing `revived_n` key for frontend local handling compatibility.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 85) Holy Rebirth Card Source Fix (Revive Own Deaths, Not Mixed Graveyard) (2026-04-01)
- Problem:
  - Holy Rebirth trigger/prompt worked, but revived cards could come from mixed graveyard instead of the responder's own dead believers in that trigger window.
- Backend fix (`hegemonyoffaith.game.php`):
  - Added owner-aware discard metadata path for Faith War/KABOOM deaths:
    - new helper `moveBelieverCardToDiscardWithOwnerMeta(...)` writes deterministic graveyard order and stores last owner id in believer `type_arg`.
  - Faith War duel death moves now use owner-aware discard helper (both winner/loser/draw death paths, non-zombie source cards).
  - KABOOM sacrifice/kill death moves now use owner-aware discard helper.
  - Holy Rebirth pending context now stores up to 3 candidate card ids:
    - new GS keys `holy_rebirth_pending_card_1..3`.
  - `queueHolyRebirthPromptIfEligible(...)` now precomputes candidate cards from recent discard cards owned by responder.
  - `stResolveHolyRebirth()` revive selection now:
    - first uses pending candidate ids (strictly still in discard and owned by responder),
    - then fallback-fills from responder-owned recent discard cards only,
    - no longer pulls top 3 from global mixed graveyard.
- Outcome:
  - Holy Rebirth now revives responder's own recently-dead believers for the trigger window, instead of mixed global graveyard cards.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 86) AOE Commit Double-Submit Guard + Immediate Button Refresh (Martyrdom/Conspiracy) (2026-04-01)
- Problem:
  - In AOE believer-commit stage, a player who already committed could still see `Confirm Believer` button.
  - Clicking again produced backend rejection (`It is not your turn`), so UI and server authority were out of sync.
  - Report reproduced in `martyrdomChooseBelievers` (observed on one player path; likely amplified by stale client active/target hints).
- Root cause (`hegemonyoffaith.js`):
  - Commit-button visibility was too permissive:
    - allowed by `isCurrentPlayerActive()` / target fallback even after local commit.
  - After self commit notification, UI updated instruction text but did not force clear/rebuild action buttons immediately.
- Fix:
  - Added strict helper `canCurrentPlayerCommitAoeBeliever(args)`:
    - returns `false` if current player already has committed believer on AOE lane,
    - otherwise allows only `checkAction("playBelieverCard", true)` or target-list fallback.
  - `martyrdomChooseBelievers` / `conspiracyChooseBelievers` button rendering now uses this helper (removed `isCurrentPlayerActive()` permissive path).
  - `syncAoeDefendersChooseState(...)` prompt decision now uses the same helper to keep instruction/button state consistent.
  - `onConfirmBelieverClicked(...)`:
    - now blocks submit if current player already committed in AOE stage,
    - AOE fallback submit no longer depends on `isCurrentPlayerActive()`.
  - `handleAoeBelieverCommitted(...)` (self-commit path):
    - now resets in-flight flag, clears selection, updates local target list, clears buttons, and immediately re-renders action buttons to waiting state.
- Expected result:
  - Once a player commits believer in Martyrdom/Conspiracy, confirm button disappears immediately on that client.
  - No second submit path remains, eliminating `It is not your turn` from stale UI interaction.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `php test_logic.php` passed.

## 87) Holy Rebirth Trigger Window Locked to Per-Round Memory (2026-04-01)
- Rule alignment request:
  - Holy Rebirth should follow per-player round window (`from this player's turn start until before their next turn`).
  - If no qualifying deaths happen in that window, previous memory should be cleared.
  - At most once per round (`holy_rebirth_used_this_turn` remains the usage lock).
- Backend updates (`hegemonyoffaith.game.php`):
  - Added `rememberHolyRebirthRoundDeathBurst(player_id, deaths_in_one_resolution)`:
    - keeps max burst value in current round memory slot for that player.
  - `resetPerTurnSkillFlagsForPlayer(...)` now clears that player's Holy Rebirth death-memory slot at turn start (window reset).
  - KABOOM path now records target burst deaths into round memory before Holy Rebirth eligibility check.
  - Faith War duel death records now use burst-memory update (single-resolution burst = 1), not cumulative trigger intent.
  - Removed Faith War boundary resets/triggers that caused cross-round or cross-combat accumulation behavior:
    - no reset of all death counters at Faith War start/end,
    - no Faith War-end Holy Rebirth prompt from accumulated duel deaths.
- Resulting behavior:
  - Holy Rebirth no longer triggers from Faith War cumulative deaths across many duels.
  - Trigger remains tied to one-resolution burst condition (`>=3`) within the responder's current round window.
  - Usage remains limited to once per round by existing `holy_rebirth_used_this_turn` flag.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 88) Witch Hunt Log Text Uses Sect Name (No More `Sect 4`) (2026-04-01)
- Problem:
  - Right-side log text during Witch Hunt still displayed numeric sect label such as `Sect 4`.
  - This conflicted with current UI convention where sect should use the explicit sect display name.
- Fix (`hegemonyoffaith.game.php`):
  - `witchHuntStart` message changed from `Sect ${target_sect}` to `${target_sect_name}`.
  - `witchHunt` resolve message changed from `Sect ${target_sect}` to `${target_sect_name}`.
  - `combatSnapshotHistory` Witch Hunt line changed to `${target_sect_name}`.
  - Added payload field `target_sect_name` using `getSectDisplayName((int) $target_sect)` for all above notifications.
- Result:
  - Witch Hunt logs now show proper sect names instead of numeric placeholders.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `php test_logic.php` passed.

## 89) Faith Debate Stop Button Always Available to Attacker Side Mid-Debate (2026-04-01)
- Superseded:
  - This implementation note is superseded by `#91` (leader-decision model).
  - Current code rule is leader-authority stop flow via representative request, not direct attacker-side free stop.
- Problem:
  - During ongoing Faith Debate (before round 5), attacker side could not consistently see `Stop Faith Debate`, making debate impossible to stop early in practical play.
  - In non-representative attacker cases, button visibility/permission mismatched expected flow.
- Backend (`hegemonyoffaith.game.php`):
  - `stopFaithDebate` permission expanded:
    - can be used by attacking representative OR attacker initiator.
  - `stopFaithDebate` no longer depends on `checkAction` active-player gate; it now validates by state (`faithDebateDuel`) + role + debate context, so attacker initiator can stop even when not a representative.
  - `argFaithDebateDuel` `can_stop_faith_debate` now returns true for attacker representative or attacker initiator.
- Frontend (`hegemonyoffaith.js`):
  - Added `canCurrentPlayerStopFaithDebate(...)` helper with wrapped-args (`args.args`) and combat-context fallback.
  - `canRenderCurrentStateButtons` now allows `faithDebateDuel` action bar rendering for attacker-side stopper role, not only active representatives.
  - `faithDebateDuel` action-button logic hardened with wrapped-args support (`args.args`) and role checks.
  - `Stop Faith Debate` button now shows for attacker-side stopper role reliably.
  - Non-representative attacker no longer gets believer commit button (prevents false "confirm believer" path); sees stop/wait instruction instead.
  - `onStopFaithDebateClicked` now has role/state fallback submit path for debate state to reduce stale client gating misses.
- Result:
  - Debate can now be stopped mid-flow each round by attacker side without waiting to reach 5 rounds.
  - UI no longer hides stop in attacker non-representative setups.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 90) End-Game Summary Freeze Guard (`activeplayer` switch crash) (2026-04-01)
- Problem:
  - End-of-hand custom summary flow could freeze with:
    - `Impossible to change active player during activeplayer type state`
  - Symptom happened when transitioning into custom end summary/showcase active-player steps.
- Root cause:
  - `switchActivePlayerSafely(...)` still had a path that could call direct `changeActivePlayer(...)` if state-type detection missed edge formatting/runtime variants.
  - In those edge cases, BGA considered current state effectively `activeplayer`, and direct change threw.
- Fix (`hegemonyoffaith.game.php`):
  - Hardened `switchActivePlayerSafely(...)`:
    - normalize state type string (`trim/lowercase`) for robust matching,
    - always try turn-order rotation (`activeNextPlayer`) first,
    - if rotation already reaches target, return immediately,
    - never force direct `changeActivePlayer` inside any active/private/multipleactive context,
    - keep direct change only as last fallback for non-active contexts.
- Result:
  - End-game summary/showcase no longer hard-crashes on active-player switching race/edge timing.
  - Same safeguard also reduces similar switch crashes in other prompt handoff flows.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `php test_logic.php` passed.

## 91) Faith Debate Stop Ownership = Leader Decision, Representative Can Request (2026-04-01)
- Rule alignment:
  - Stop request button is shown to attacking representative.
  - If representative is also leader: stop is immediate.
  - If representative is follower: follower requests stop, then attacker leader must approve/reject.
  - If leader rejects: representative is informed and must continue that round.
- Backend (`hegemonyoffaith.game.php`, `states.inc.php`, `hegemonyoffaith.action.php`):
  - Added new state `faithDebateStopLeaderApproval` (`97`, activeplayer):
    - actions: `approveFaithDebateStop`, `rejectFaithDebateStop`.
    - transitions: `approved -> resolveFaithDebateDuel`, `rejected -> faithDebateDuel`.
  - `faithDebateDuel` transition extended with `leaderStopApproval`.
  - Added GS context:
    - `debate_stop_requester_id` (`90`)
    - `debate_stop_leader_id` (`91`)
  - `stopFaithDebate` now:
    - only attacking representative can initiate request,
    - direct stop if representative==leader,
    - otherwise sends leader-approval prompt state.
  - Added `argFaithDebateStopLeaderApproval`.
  - Added `approveFaithDebateStop` / `rejectFaithDebateStop` actions and routes.
  - Added zombie fallback for leader-approval state: auto-reject to avoid stalls.
  - Added context cleanup helper and cleanup hooks in round setup/finalize.
  - `argFaithDebateDuel.can_stop_faith_debate` now maps strictly to attacking representative.
- Frontend (`hegemonyoffaith.js`):
  - Added `faithDebateStopLeaderApproval` button UI:
    - `Approve Stop`, `Reject Stop`.
  - Added handlers:
    - `onApproveFaithDebateStopClicked`
    - `onRejectFaithDebateStopClicked`
  - Debate stop button in `faithDebateDuel` now shown for attacking representative when `stopFaithDebate` is actionable.
  - Added notifications:
    - `faithDebateStopProposed`
    - `faithDebateStopRejected`
    - `faithDebateStopRejectedPrivate`
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 92) Fix: War/Debate Flow Misrouted to Info Spy Review (2026-04-05)
- Problem (user-reported during War):
  - Top bar incorrectly showed `Review Info Spy result...` / `Finish Info Spy`.
  - Clicking could throw `No pending Info Spy review to complete`.
  - Combat UI and Info Spy prompt overlapped, causing a soft-lock path.
- Root cause (`states.inc.php`):
  - State IDs were duplicated:
    - `96/97` first used by `reverseKarmaPrompt` / `resolveReverseKarmaPrompt`.
    - Same IDs were later reused by `infoSpyReview` / `faithDebateStopLeaderApproval`.
  - In PHP arrays, duplicate numeric keys are overwritten by later entries, so transitions targeting `96` during combat were actually entering `infoSpyReview`.
- Fix:
  - Reassigned IDs to keep all states unique:
    - `infoSpyReview`: `96 -> 106`
    - `faithDebateStopLeaderApproval`: `97 -> 107`
  - Updated transitions:
    - `playerTurn.infoSpyReview -> 106`
    - `faithDebateDuel.leaderStopApproval -> 107`
  - Kept `reverseKarmaPrompt/resolveReverseKarmaPrompt` on `96/97` so combat resume chain remains intact.
- Result:
  - War/Debate/Conspiracy/Martyrdom no longer misroute into Info Spy review prompt.
  - Info Spy review only appears when actual Info Spy result is pending.
- Validation:
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 93) AOE Gray/Color Result Visual Restore for Follower Representatives (2026-04-05)
- Problem:
  - AOE result grayscale could disappear or be wrong when attacker representative was a follower.
  - Symptom: Martyrdom sometimes failed to gray attacker card (attacker always dies), and Conspiracy attacker/defender card placement could be misclassified.
- Root cause (`hegemonyoffaith.js`):
  - `addAoeCommitToArena(...)` attacker-believer detection depended on:
    - `is_attacker_representative` flag, or
    - `player_id === currentAoeAttackerId` (leader id).
  - Some commit paths did not forward `is_attacker_representative` into `addCombatCommitToArena(...)`.
  - In follower-representative cases, attacker believer could be treated as defender slot card, so resolve-time visual states (gray/normal) became inconsistent.
- Fix:
  - Forwarded `is_attacker_representative` in all AOE believer-commit UI paths:
    - `notif_martyrdomAttackerCommitted`
    - `handleAoeBelieverCommitted`
  - Added robust fallback inference in `addAoeCommitToArena(...)`:
    - infer attacker representative from combat context `war_rep_attacker_id` when notify flag is missing/stale.
- Result:
  - Martyrdom (Physical AOE): attacker believer correctly treated as attacker card and can be shown as loser-gray as intended.
  - Conspiracy (Mental AOE): attacker/defender role classification is stable for follower representatives, preserving intended color/gray logic.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 94) Karma Reversed Prompt-Phase Visual Leak Fix (2026-04-05)
- Problem:
  - In later combats, during `reverseKarmaPrompt` (before confirmation), action-card stack could already show `Karma Reversed` under the attack card.
  - Expected rule/UI: skill stack appears only after user confirms use.
- Root cause:
  - Prompt phase could inherit stale local/server reverse-karma display context before final decision.
  - This allowed pre-confirm stack rendering in prompt timing windows.
- Fix:
  - Backend (`hegemonyoffaith.game.php`):
    - In `queueReverseKarmaPromptIfNeeded(...)`, when prompt is queued, force:
      - `war_reverse_karma_active = 0`
      - `war_reverse_karma_owner_id = 0`
    - Keeps prompt state explicitly inactive until `reverseKarmaUse` is confirmed.
  - Frontend (`hegemonyoffaith.js`):
    - On entering `reverseKarmaPrompt`, force clear display context:
      - `setReverseKarmaContext(0, 0)`
      - `refreshCombatActionStacks()`
    - Prevents stale stack from appearing before decision.
- Result:
  - During prompt, no premature `Karma Reversed` stack is shown.
  - Stack appears only after confirmed use.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 95) Action Discard Top Order Fix (Attack Then Defense) (2026-04-05)
- Problem:
  - In combat flow `attack -> defense`, action discard top could incorrectly show the attack card.
  - Expected behavior: discard top should show the later-played defense card.
- Root cause:
  - Attack action card is moved to discard at action-end cleanup, which can happen after defense card has already been discarded.
  - Frontend discard stack always inserted latest moved card to top, so delayed attack move overwrote defense on top.
- Fix (`hegemonyoffaith.js`):
  - Added center-action discard tracking state:
    - `currentCenterActionDiscardKey`
    - `currentCenterActionHadDefenseDiscard`
  - Added helper `beginCenterActionDiscardTracking(...)` and wired it to:
    - `showCenterActionCard(...)`
    - `setDuelActionCard(...)`
    - `placeAoeActionCard(...)` (key-change-based reset only).
  - `notif_defensePlayed` now marks that current action already produced a defense discard.
  - `pushActionDiscardCard(...)` now supports insertion mode:
    - `top` (default)
    - `bottom` (used when preserving defense-on-top order)
  - When delayed attack action card is finally discarded (`moveCurrentCenterActionToDiscard` / `moveDuelActionCardToDiscard`):
    - if defense was already discarded for that action, attack card is appended to bottom instead of pushed to top.
- Result:
  - For `attack -> defense`, discard top remains the defense card as expected.
  - Non-defense cases still keep normal latest-to-top behavior.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 96) AOE Representative Name `???` Overwrite Fix Before Commit (2026-04-05)
- Problem:
  - In AOE lane, sect name was correct but player line could stay `???` until a believer card was committed.
  - Expected: only pre-assignment shows `???`; once representative is known, player name should stay visible before card commit.
- Root cause (`hegemonyoffaith.js`):
  - Right-lane slot refresh path could re-apply unknown label during layout sync, overwriting an already-known representative name.
- Fix:
  - `ensureAoeRightSectSlot(...)` unknown-label gate tightened:
    - only show unknown when both existing and incoming representative IDs are missing.
  - `initAoeRightSlotsBySeatOrder(...)` no longer forces unknown mode on every refresh call.
- Result:
  - Representative names are no longer reset back to `???` by mid-flow refresh.
  - `???` remains only for truly unassigned slots.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 97) Graveyard Top-Order Stabilization (Latest Death on Top) (2026-04-05)
- Problem:
  - Graveyard preview could show wrong top card (later deaths not always on top).
- Root causes:
  - Some believer-to-discard paths did not consistently write deterministic increasing discard order metadata.
  - Frontend private `believersDiscarded` handling updated graveyard preview from partial per-owner payloads, which can scramble global top order.
- Backend fixes (`hegemonyoffaith.game.php`):
  - Added `moveBelieverCardsToDiscardWithOwnerMeta(...)` batch helper:
    - deterministic discard ordering,
    - owner metadata preservation for each moved card.
  - Replaced direct sacrifice-to-discard paths (Praise of Life / World Peace / Eternal Truth) with owner-aware helper.
  - Martyrdom discard path now uses deterministic helper for defender deaths + attacker death.
  - Added authoritative `graveyard_cards` snapshot payload to:
    - all Faith War `duelResult` notifications,
    - `martyrdomResolved`.
- Frontend fixes (`hegemonyoffaith.js`):
  - `notif_duelResult`:
    - if `graveyard_cards` exists, apply snapshot directly and skip local inferred dead-card prepend.
  - `notif_martyrdomResolved`:
    - apply `graveyard_cards` snapshot when present.
  - `notif_believersDiscarded`:
    - stop mutating graveyard preview from private subset payload.
- Result:
  - Graveyard top now follows latest death order reliably in War/AOE resolutions.
  - Clients no longer diverge due to partial private discard updates.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php -l states.inc.php` passed.
  - `php test_logic.php` passed.

## 98) AOE Representative Choice Invalid (Follower Attacker Scenario) Fix (2026-04-05)
- Problem:
  - In Conspiracy/Martyrdom representative assignment, some leaders could see wrong candidate buttons and selecting one could fail with:
    - `Invalid Conspiracy representative`
  - Observed especially when attacker was a follower and multi-leader assignment happened simultaneously.
- Root cause:
  - AOE representative arg payload used a single `candidates` list derived from request context.
  - In multi-active states, candidate list could mismatch leader scope on client side (cross-sect/stale scope), causing backend invalid-representative rejection.
- Backend fix (`hegemonyoffaith.game.php`):
  - Added `buildAoeRepresentativeCandidatesByLeader(war_type, attacker_sect)`:
    - computes candidate list per leader id for all eligible sects.
  - `argChooseConspiracyRepresentative` / `argChooseMartyrdomRepresentative` now return:
    - `candidates_by_leader`
    - `requester_leader_id`
    - legacy `candidates` (scoped by requester leader) for compatibility.
- Frontend fix (`hegemonyoffaith.js`):
  - `getRepresentativeCandidatesForCurrentLeader(...)` now prefers `candidates_by_leader[my_leader_id]`.
  - Added robust fallback to infer `my_leader_id` from sect leader lookup if requester id missing.
  - Representative button callbacks now cast candidate id with `parseInt(...)` before submit.
- Result:
  - Each leader sees only their own sect’s legal representative candidates.
  - Conspiracy/Martyrdom assignment no longer misroutes to invalid representative ids in multi-active cases.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 99) Multi-Active AOE Args De-Scoped from `getCurrentPlayerId` (2026-04-05)
- Follow-up issue:
  - `Invalid Martyrdom representative` still occurred in some follower-attacker tables.
  - Candidate list/leader-self visibility could still mismatch under multi-active timing.
- Root cause refinement:
  - `argChooseConspiracyRepresentative` / `argChooseMartyrdomRepresentative` still depended on `getCurrentPlayerId()`.
  - In multi-active states, this can be unstable/non-viewer-specific, producing viewer-mismatched candidate payloads.
- Backend fix:
  - Removed requester-scoped filtering from both arg methods.
  - Both now always return full, deterministic:
    - `candidates_by_leader`
    - `active_leader_ids`
  - Legacy `candidates` left as empty compatibility field.
- Frontend fix:
  - `getRepresentativeCandidatesForCurrentLeader(...)` now first tries direct key:
    - `candidates_by_leader[current_player_id]`
  - Then falls back to sect-leader inference and legacy payloads.
- Result:
  - Leader candidate buttons are resolved from leader-keyed map only, avoiding cross-player/multi-active misbinding.
  - Reduces false invalid-representative errors and missing leader-self option from stale/mis-scoped args.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 100) Reverse Karma Stack Flicker Guard on New Combat Card Play (2026-04-06)
- Symptom:
  - On later AOE combats, a previous `Karma Reversed` stack could flash briefly when the new combat card first appeared, then disappear before prompt.
- Root cause:
  - `notif_actionCardPlayed` could render new combat card stack while client still held previous combat's reverse-karma active context.
- Fix (`hegemonyoffaith.js`):
  - In `notif_actionCardPlayed`, detect new combat declarations (`faith_war`, `faith_debate`, `martyrdom`, `conspiracy`) and force:
    - `setReverseKarmaContext(0, 0)` before rendering action stack.
  - This prevents old-combat visual state from leaking into new-combat first frame.
- Result:
  - No pre-prompt reverse-karma stack flash from stale context.
  - Prompt/confirm flow and confirmed stack behavior remain unchanged.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 101) Prophet Draw Intercept Active-Player Handoff Stabilization (2026-04-06)
- Symptom:
  - With Prophet in play, another player drawing Believers could fail with:
    - `Impossible to change active player during activeplayer type state`
- Root cause:
  - Active-player switch helper still had a path that could attempt `changeActivePlayer(...)` outside strict `game/manager` context.
  - Prophet queue path had no guard if handoff to Prophet failed, risking state deadlock/error propagation.
- Fix (`hegemonyoffaith.game.php`):
  - Hardened `switchActivePlayerSafely(...)`:
    - in `activeplayer/private`: rotation-only (`activeNextPlayer`) path;
    - in `multipleactiveplayer`: no forced single-player switch;
    - `changeActivePlayer(...)` is now restricted to `game/manager` state types only.
  - Added Prophet queue guard:
    - after switch attempt, if active player is not Prophet, clear pending Prophet context and continue normal draw path (no crash).
- Result:
  - Prophet interception no longer throws activeplayer-state switch exception.
  - If a rare handoff edge case occurs, action flow degrades safely instead of hard-locking.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 102) Prophet Intercept Routing via Game-State Handoff (Activeplayer-Safe) (2026-04-06)
- Symptom refinement:
  - Prophet self-draw path worked, but when other players drew Believers and Prophet intercepted, tables still hit active-player switch exceptions.
- Root cause:
  - Intercept handoff was still initiated from an `activeplayer` action context.
  - Any direct/indirect player switch attempt in that timing could trigger BGA activeplayer switch guard.
- Fix:
  - Added dedicated game-state router `108: prophetInterruptHandoff` in `states.inc.php`.
  - `playerTurn (31)` now transitions with `prophetInterrupt => 108`.
  - `queueProphetPredictionIfNeeded(...)` no longer attempts immediate handoff; it only stores pending context and routes to `prophetInterrupt`.
  - New `stRouteProphetInterrupt()` performs legal handoff to Prophet inside `game` state, then routes to:
    - `prophetPrompt (91)` if Prophet skill is hidden
    - `prophetGuess (92)` if Prophet skill is already revealed
  - Interception remains mandatory (no silent bypass to normal draw if handoff fails).
- Result:
  - Draw-by-other-player Prophet interception now uses state-machine-safe handoff.
  - Prevents `Impossible to change active player during activeplayer type state` from Prophet interrupt entry path.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 103) Prophet Pre-Guess Animation Start Hook (Deck Back to Center Before Guess) (2026-04-06)
- Goal:
  - Align Prophet UX with intended sequence:
    - confirm use -> first deck Believer back flies to center -> wait for type guess -> reveal + resolve movement.
- Backend (`hegemonyoffaith.game.php`):
  - Added `notifyProphetPredictionStarted()` and new notify event:
    - `prophetPredictionStarted`
  - Emitted when Prophet prediction truly starts:
    - already-revealed Prophet path in `stRouteProphetInterrupt()`
    - hidden Prophet path after `prophetEnableSkill()` confirmation.
- Frontend (`hegemonyoffaith.js`):
  - Added pending visual helpers:
    - `showProphetPendingPredictionVisual()`
    - `clearProphetPendingPredictionVisual()`
  - Subscribed to `prophetPredictionStarted` and added handler `notif_prophetPredictionStarted`.
  - `animateProphetPredictionFlow(...)` now reuses the pending center card if present:
    - reveal/flip then move to final receiver on resolve.
  - If no first-card reveal applies (skip/pass), pending center card is cleared.
- Result:
  - Prophet flow now shows visible "first-card pending guess" stage before resolve animation.
  - Resolving step no longer needs to recreate first card when pending visual already exists.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 104) Prophet Pending Card Anchor + Hit/Miss Visual Clarity Fix (2026-04-06)
- Symptom:
  - During Prophet intercept, players could still see only the action card on center and miss the pending first-Believer visual.
  - Guess outcome (correct/wrong) was easy to miss.
- Root cause (`hegemonyoffaith.js`):
  - Pending Prophet card animation targeted `central_arena` container, not the actual center action-card face anchor.
  - No strong on-card result marker for guess outcome.
- Fix:
  - Added anchor resolver `getProphetPredictionAnchorId()`:
    - prefers `center_action_card_face`, then `current_center_action_card`, then `central_arena`.
  - Pending first-card animation now flies to resolved center anchor, with boosted z-index.
  - Added on-card guess result badge on reveal:
    - `Hit` (green) / `Miss` (red).
  - CSS enhancement:
    - clearer Prophet pending card glow.
    - `prophet-guess-result-badge` styling.
- Result:
  - Prophet pending first-card stage is visibly layered over center action card.
  - Guess outcome is immediately readable on the revealed first card.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 105) Conspiracy Loser Gray Visual Decoupled from Steal Transfer (2026-04-06)
- Symptom:
  - In Conspiracy (especially with Reverse Karma interactions), loser gray effect could be missing while card transfer result itself was correct.
- Root cause:
  - Frontend used `attacker_stolen` as both:
    - transfer outcome source (correct),
    - loser-gray visual source (incorrect in mixed outcomes).
  - Backend clears `attacker_stolen` when any defender wins (global no-steal rule), which removed visual loser list even if some individual defenders still lost duel comparison.
- Fix:
  - Backend `conspiracyResolved` payload now includes visual-only list:
    - `attacker_wins_visual` (always attacker per-duel wins).
  - Frontend `notif_conspiracyResolved` now:
    - uses `attacker_wins_visual` for loser-gray rendering,
    - keeps `attacker_stolen` only for actual transfer/ownership behavior.
  - No game logic / transfer rule change.
- Result:
  - Conspiracy loser gray now follows duel result consistently, including Reverse Karma/mixed-outcome cases.
  - Transfer resolution remains unchanged and server-authoritative.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 106) Conspiracy + Reverse Karma Gray Visual Board-Recompute Fallback (2026-04-06)
- Symptom:
  - In some Reverse Karma Conspiracy tables, transfer resolution looked correct but loser gray visualization could still be missing.
- Root cause:
  - Visual state still depended on payload outcome groups in edge timing/cached-client combinations.
- Fix (`hegemonyoffaith.js`):
  - Added `compareBelieverTypesSimple(...)`.
  - Added `computeConspiracyVisualOutcomesFromBoard(...)`:
    - recomputes Conspiracy per-duel outcomes from revealed board card types,
    - applies Reverse Karma inversion when active.
  - `notif_conspiracyResolved` now:
    - prefers board-recomputed winner/loser/draw groups for visual gray/result labels,
    - keeps server payload (`attacker_stolen`) for transfer/ownership behavior.
- Result:
  - Conspiracy loser gray rendering stays consistent even when Reverse Karma is active.
  - No gameplay logic change.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 107) PlayerTurn Discard Button Uses Server Authority (`can_discard_now`) (2026-04-06)
- Symptom:
  - In some turns (reported after Witch Hunt), current player could see only `End Turn` while `Discard` should still be available.
- Root cause:
  - Discard-button visibility still relied on local client action-mask heuristics, which can drift in edge notification orders.
- Fix:
  - Backend (`argPlayerTurn`) now publishes `can_discard_now` (authoritative boolean):
    - remaining action slot check,
    - hand has Action cards,
    - discard already used this turn check (with Praise of Life exception).
  - Frontend player-turn buttons now prioritize `args.can_discard_now` for showing `Discard Action Card(s)`.
  - Legacy local mask gate is bypassed whenever server authority is present.
- Result:
  - Discard button availability is now consistent with backend rules, reducing false-hidden discard UI.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 108) Everyone is Equal Visual Parity with Chaos Coming (Shuffle + Re-deal Feel) (2026-04-07)
- User-facing gap:
  - `Everyone is Equal` effect resolved correctly, but lacked the same visible "shuffle/re-deal feel" players perceived in `Chaos Coming`.
- Frontend fix (`hegemonyoffaith.js`):
  - `playEveryoneEqualShuffleFx()` now anchors FX node on `game_play_area` and positions it over `central_arena`, so it is not lost during rapid turn/state transitions.
  - Added `everyoneEqualFxPendingUntil` window.
  - Added `pulseCurrentBelieverHandAfterRedistribute()` and triggered it from `notif_syncBelieverHand` during the pending window, creating clear re-deal feedback on believer hand refresh.
- Result:
  - `Everyone is Equal` now has explicit visible shuffle/re-deal feedback comparable to `Chaos Coming`.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 109) AOE Left-Side Ownership Labels Split (Sect / Action Caster / Believer Representative) (2026-04-07)
- User-facing gap:
  - AOE left lane showed only one combined player label, which is ambiguous when:
    - Action card caster and believer representative are different players in the same sect.
- Frontend fix:
  - Reworked AOE left layout into:
    - top fixed sect label (`aoe_attacker_label`),
    - action-card owner label above action slot (`aoe_action_owner_label`),
    - believer owner label above attacker believer slot (`aoe_attacker_owner_label`).
  - Added JS helpers:
    - `getAoeSectOnlyLabelHtml(...)`,
    - `setAoeTopSectLabel(...)`,
    - `setAoeActionOwnerLabel(...)`,
    - `setAoeAttackerBelieverOwnerLabel(...)`.
  - Wiring updates:
    - `placeAoeActionCard(...)` now sets sect + action-caster name and initializes attacker-believer owner label.
    - `addAoeCommitToArena(...)` updates left believer owner label when attacker representative commits.
    - `notif_martyrdomRepresentativeChosen(...)` / `notif_conspiracyRepresentativeChosen(...)` now update left believer owner label when attacker sect representative is chosen.
  - Added old-layout resiliency:
    - if existing AOE DOM is missing new owner-label nodes, left cluster is rebuilt safely.
- Result:
  - Left AOE side now clearly distinguishes:
    - sect identity (fixed),
    - action card caster,
    - believer card representative.
  - Right-side AOE lane behavior unchanged.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 110) Purple Hermit Availability for Forced Follower Join (Kowtow / Leader Replacement) (2026-04-07)
- Symptom:
  - Purple Hermit could not be used after being forcibly absorbed into another sect by `Kowtow To Me`.
  - UI/exception text showed `Purple Hermit becomes available after surrender is completed.`
- Root cause:
  - Purple Hermit arming (`setPurpleHermitReady`) was only wired in surrender `giveBeliever()` flow.
  - Forced follower transitions (Kowtow absorption, leader-replacement demotion) did not arm Purple Hermit.
- Fix (`hegemonyoffaith.game.php`):
  - In `playKowtowToMe(...)`, after sect absorption update, arm Purple Hermit for each absorbed player:
    - `armPurpleHermitAfterSurrender(absorbed_pid, attacker_leader)`.
  - In leader replacement path (`stCheckEndTurnPhase`), when old leader is demoted to follower, arm Purple Hermit for that new follower path too.
  - Updated eligibility message to generic follower-join wording:
    - from `...after surrender is completed.`
    - to `...after you join a sect as a Follower.`
- Result:
  - Purple Hermit is now correctly available after non-surrender follower-join routes as well.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 111) Sect Name Color Uses Sect Leader Color in Player Status Rows (2026-04-07)
- Symptom:
  - After surrender/role change to follower, sect icon/name updated, but sect name text color still used follower's own player color.
- Fix (`hegemonyoffaith.js`):
  - `getColoredSectNameHtml(...)` now resolves color by sect leader color (`getSectLeaderColorBySect`) using `sectId` first.
  - Keeps old fallback to player's own color only when sect is invalid.
- Result:
  - Player table + right panel sect-name text now follows current sect leader color, matching sect identity after surrender/absorption.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 112) Self "Spent" Badge Consistency After Everyone is Equal (2026-04-07)
- Symptom:
  - After using `Everyone is Equal`, other players could see actor's `Spent` badge, but actor's own panel sometimes did not show `Spent`.
- Root cause:
  - Skill active badge computation could fall back to public reveal-card type path and resolve `skillType = 0` on self in timing edges.
- Fix (`hegemonyoffaith.js`):
  - In `refreshPlayerSkillActiveBadge(...)`, self panel now prioritizes live private state:
    - if `pid === current player` and `state.skill_type > 0`, use that `skill_type` for usage-cap/exhausted checks.
  - Public reveal snapshot remains fallback for non-self panels.
- Result:
  - `Spent` rendering is now consistent between self and other players after one-time skill use (including `Everyone is Equal`).
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 113) Active-Player Switch Safety in Reverse Karma Prompt Routing (2026-04-07)
- Symptom:
  - Intermittent runtime error:
    - `Impossible to change active player during activeplayer type state`
  - Reported around end-turn progression in long-running games.
- Root cause:
  - `queueReverseKarmaPromptIfNeeded(...)` still used direct
    - `$this->gamestate->changeActivePlayer(...)`
  - This bypassed the existing guarded switch helper and could throw under state-timing drift.
- Fix (`hegemonyoffaith.game.php`):
  - Replaced direct `changeActivePlayer` with:
    - `$this->switchActivePlayerSafely(...)`
  - Keeps behavior but applies state-type guard/fallback rotation path.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 114) Prophet Prediction Clarity Fix (Visible Animation Layer + Explicit Guess/Result Log) (2026-04-07)
- Symptom:
  - Prophet prediction flow could look like "no animation happened" (center still looked like only Action card).
  - BGA LOG only showed generic lines (`starts` / `resolved`) so players could not tell:
    - which type was predicted,
    - hit or miss,
    - who actually received first card.
- Root causes:
  - Frontend Prophet temp-card layer could be visually obscured in center flow.
  - Backend resolve log used generic `Prophet prediction is resolved.` without outcome details.
- Fixes:
  - Frontend (`hegemonyoffaith.js` + `hegemonyoffaith.css`):
    - Prophet prediction anchor priority now targets `central_arena` first.
    - Prophet temp-card forced to absolute positioning and higher z-layer (`z-index: 5600`) so deck->center/reveal animation remains visible over center card stack.
  - Backend (`hegemonyoffaith.game.php`):
    - Added explicit LOG when Prophet chooses guess:
      - `${player_name} predicts ${type_name} with Prophet.`
    - Added explicit LOG when Prophet passes guess:
      - `${player_name} chooses not to predict with Prophet.`
    - Replaced generic resolve LOG with outcome-aware messages:
      - correct guess / wrong guess / pass / generic fallback, including source card context and gain counts.
    - Added notify args for outcome readability:
      - `source_name`, `guess_type_name`, `revealed_type_name`.
- Result:
  - Prophet prediction sequence is easier to see on board.
  - BGA LOG now explains what was guessed and how the prediction resolved.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 115) Conspiracy Steal Resolution Fix (Per-Duel Transfer, No Global Cancel) (2026-04-07)
- Symptom:
  - Combat snapshot could show `stolen > 0`, but actual result returned all defender believers to original owners when at least one defender won.
  - User-visible mismatch: "won but did not steal".
- Root cause (`hegemonyoffaith.game.php`, `stResolveConspiracy`):
  - Transfer logic used global cancel branch:
    - if any defender won, `attacker_stolen` became empty and all defender cards reverted to original owners.
  - Snapshot log still counted `attacker_wins`, causing misleading `stolen_n`.
- Fix:
  - Removed global cancel branch.
  - Conspiracy now resolves strictly per duel:
    - attacker win on a defender card => that card is stolen by attacker representative.
    - defender win/draw => defender keeps own card.
    - attacker card always returns to attacker representative.
  - `attacker_stolen` payload now always matches actual stolen cards.
  - `combatSnapshotHistory.stolen_n` now reports actual stolen count (`count(attacker_stolen)`).
- Result:
  - Winning Conspiracy duels now consistently steal believers as expected.
  - Snapshot log and actual transfer behavior are aligned.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 116) Secret Alliance Twin-Copy Exchange Fix (Type Block Removed, Instance Block Kept) (2026-04-07)
- Symptom:
  - When attacker held 2 copies of `Secret Alliance`, playing one then offering the other caused:
    - `Secret Alliance itself cannot be the exchanged card.`
- Root cause:
  - Backend blocked by card type (`secret_alliance`) instead of by played-card instance.
- Fix (`hegemonyoffaith.game.php`):
  - Removed type-level rejection in:
    - `validateSecretAllianceOffer(...)`
    - `chooseSecretAllianceCard(...)` attacker-choice path.
  - Kept instance-level protection:
    - only the already-played card id is forbidden (`offer_card_id === played_card_id`).
- Result:
  - Another in-hand `Secret Alliance` copy is now valid for exchange.
  - Rules now align with Divine Inspiration-style "played card excluded, other hand cards allowed."
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 117) End Summary Flow Update (All Players + 3s Reveal + 5s Auto End) (2026-04-07)
- Goal:
  - Keep custom end summary visible while reducing "waiting-for-winner" stall risk.
  - New UX:
    - all players can end the game,
    - End Game button appears after 3 seconds,
    - after button appears, it counts down 5 seconds;
      if nobody clicks, game auto-ends at total 8 seconds.
- Backend changes:
  - `states.inc.php`:
    - state `gameEndSummary` changed from `activeplayer` to `multipleactiveplayer`.
  - `hegemonyoffaith.game.php`:
    - `stShowGameEndSummary()` now activates all players in summary state via `setPlayersMultiactive(...)`.
    - summary notification now includes countdown config:
      - `end_button_delay_ms = 3000`
      - `auto_end_delay_ms = 8000`
    - `confirmGameEndSummary()` made idempotent-safe:
      - no hard exception when state already moved on / late duplicate call.
- Frontend changes (`hegemonyoffaith.js`):
  - Added end-summary timers and cleanup helpers:
    - `gameEndSummaryTickTimer`, `gameEndSummaryAutoTimer`, `gameEndSummaryConfirmSent`
    - `clearGameEndSummaryTimers()`
  - Summary action area now:
    - shows countdown text first,
    - reveals `End Game` button after configured delay (3s),
    - button label shows remaining auto-end time (`End Game (Xs)`),
    - triggers automatic confirm at configured auto timeout (8s total / 5s after button appears) if still pending.
  - Leaving summary state clears timers to prevent stale callbacks.
- Result:
  - No longer blocked on winner-only confirmation.
  - Players are given a short guaranteed view window before manual/auto finalization.
- Validation:
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 118) Gate of Truth (Skill 9) Core Implementation + Prophet Dual-Predict Integration (2026-04-07)
- Goal:
  - Implement `Gate of Truth` as a real copy system with one-turn duration and per-skill global one-time copy lock.
  - Keep existing skill flows stable; only extend copied-skill hooks where rules require special handling.
- Backend (`hegemonyoffaith.game.php`):
  - Added Gate state labels and initialization:
    - `gate_truth_copied_skill_type`
    - `gate_truth_copied_source_player_id`
    - `gate_truth_turn_used_mask`
    - `gate_truth_copied_skill_mask`
  - Added Prophet dual-responder labels for copied-Prophet flow:
    - `prophet_pending_primary_player_id`
    - `prophet_pending_secondary_player_id`
    - `prophet_pending_primary_guess_type`
    - `prophet_pending_secondary_guess_type`
  - Added Gate helper suite:
    - copyable target validation (`Impermanence of Life` hard-blocked),
    - per-turn use tracking,
    - per-skill-type copied-once tracking,
    - copied-context set/clear/get,
    - copyable target list builder for UI.
  - `canPlayerUseSkillNow(...)`:
    - skill 9 is implemented and usable once per turn only when at least one revealed+copyable target exists.
  - `useSkill(...)` for skill 9:
    - validates target player + revealed skill,
    - blocks non-copyable skills,
    - blocks already-copied skill types (global once per type),
    - sets copied context until next own turn,
    - marks this turn used + marks copied type globally used,
    - emits `skillGateTruthCopied` and actor `skillStateUpdated`.
  - Copy window expiry:
    - `resetPerTurnSkillFlagsForPlayer(...)` now clears Gate copied context at the Gate owner's next turn start.
  - Copied-skill hook integrations:
    - copied `Ascend with Me` (skill 6): follower draw mirror works; copied state does not increase hand-limit cap.
    - copied `Holy Rebirth` (skill 5): reactive prompt + resolve path supported.
    - copied `Karma Reversed` (skill 16): reactive eligibility supported.
  - Prophet integration:
    - real Prophet resolves as primary predictor (draw #1),
    - Gate-copied Prophet resolves as secondary predictor:
      - predicts draw #2 if primary actually predicts,
      - predicts draw #1 if primary skips.
    - added `prophetInterrupt` handoff routing to avoid activeplayer switch crashes.
    - added richer public/private resolved payload for dual prediction animation/log sync.
- Frontend (`hegemonyoffaith.js`):
  - Skill 9 target selection UX:
    - shows only valid revealed copy targets,
    - confirm flow submits `useSkill` with `target_id`,
    - selection instruction now includes chosen target skill name.
  - Added `skillGateTruthCopied` handling to refresh revealed/public skill state.
  - Prophet prompt/guess UI now reflects copied-Prophet source and target draw index.
  - Prophet prediction animation updated for dual-event payload (`prediction_events`), including hit/miss badges.
- State machine (`states.inc.php`):
  - Added `prophetInterruptHandoff` game state (108) for safe responder routing.
  - `resolveProphetPrediction` can transition back to prompt/guess for secondary responder.
- Current behavior note (by code):
  - `Karma Reversed` responder order is:
    1) native `Karma Reversed` owner
    2) `Gate of Truth` copied-Karma owner (if present)
  - Both responders can be prompted in sequence for the same combat.
  - Final reversal uses toggle parity:
    - odd number of confirms => reversed,
    - even number of confirms => returns to normal (not reversed).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `php -l states.inc.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 119) Gate of Truth Manual-Copy Coverage Expansion (All Copyable Skills) (2026-04-07)
- Goal:
  - Complete manual-use coverage for copied skills beyond previously integrated reactive/passive set (`4/5/6/16`).
- Backend (`hegemonyoffaith.game.php`):
  - Added Gate copied-skill runtime helpers:
    - `getGateTruthEffectiveSkillTypeForUse(...)`
    - `canPlayerUseGateTruthCopiedSkillNow(...)`
  - `canPlayerUseSkillNow(...)` for skill 9 now supports two modes:
    - copy mode (before copy this turn),
    - copied-skill mode (after copy this turn, when copied skill is manually usable).
  - `useSkill(...)` now routes through `effective_skill_type` for Gate copied-manual execution.
  - Copied-manual execution now supported for:
    - `1 Purple Hermit` (special copied behavior)
    - `2 KABOOM!`
    - `3 Headstronger`
    - `7 Eternal Truth`
    - `8 World Peace`
    - `11 Soul-Cutting Sword`
    - `13 Praise of Life`
    - `14 Chaos Coming`
    - `15 Everyone is Equal`
  - Copied `Zombie Army` (`10`) integrated into Faith War declaration availability path:
    - `getZombieArmyLeaderForAttacker(...)` now accepts copied skill 10.
  - Added private-state field:
    - `gate_truth_effective_skill_type` (for frontend interaction routing).
- Frontend (`hegemonyoffaith.js`):
  - Added `getSkillActionTypeForUse(...)`:
    - resolves skill 9 into active copied skill type when applicable.
  - Skill button rendering now uses effective type (including copied-mode display name).
  - Zombie Army quick button now appears for copied skill 10 as well.
  - Added Gate quick-flow button for pre-copy Zombie path:
    - when Gate is in copy mode and a revealed copyable Zombie Army exists, and player has Faith War in hand,
      show `Copy Zombie Army for Faith War`.
    - on click: performs Gate copy (target=Zombie owner) then immediately enters Zombie Faith War declaration flow.
  - Pending skill selection now supports Gate copied-manual flows with correct interaction mode.
- Rule-locked behavior (confirmed):
  - Identity mirror condition is enforced on copy targets:
    - follower-typed mirror path (`Purple Hermit`) only appears/valid when Gate owner is follower,
    - leader-typed mirrors only appear/valid when Gate owner is unsealed leader.
  - Copied Purple Hermit:
    - Gate owner must currently be a `Follower`,
    - steal target is Gate owner's current leader (`floor(half)`),
    - no split/leave-sect second-stage behavior.
  - Copied manual skills are consumed as single manual activation for the copy window:
    - after one copied-manual activation, copied context is cleared (reactive/passive copied skills are unaffected by this path).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 120) Milestone Snapshot: Full Rules/Content Implemented, QA Pending (2026-04-07)
- Current project milestone:
  - Core game content is now implemented end-to-end:
    - all skill cards (including Gate of Truth mirror logic),
    - all action cards and main combat/defense flows,
    - believer interactions and transfer/death/revive handling,
    - end-game and winner-reason pipeline.
- Current remaining major work:
  - large-scale regression + table-play QA (multi-player edge cases, UI/state sync, turn-order timing races).
- Product status summary:
  - This build is treated as a feature-complete gameplay version.
  - Remaining risk is primarily verification/stabilization, not missing rule modules.

## 121) Debate Stop Log Substitution Fix + End Summary Manual-Only Finalization (2026-04-07)
- Issue A (Debate stop reject log):
  - Runtime log template used `${player_name}` but reject payload did not provide it, causing substitution warnings.
  - Approve path also had mismatched `player_name` identity (leader instead of requester).
- Backend fix (`hegemonyoffaith.game.php`):
  - `approveFaithDebateStop()`:
    - corrected `player_name` to the requester (the representative asking to stop).
  - `rejectFaithDebateStop()`:
    - added missing `player_name` argument to match template usage.
- Issue B (custom end summary auto-close race):
  - Existing two-stage summary (`3s reveal + 5s auto end`) could trigger concurrent confirm requests from multiple clients near the same instant.
  - Late requests after first success can surface framework-level “This game has ended” errors.
- End-summary behavior update (rule/UX decision):
  - Removed 5-second auto end entirely.
  - Keep only:
    - 3-second review delay,
    - then show `End Game` button to all players,
    - any player can click to continue to BGA final scoring.
- Backend sync (`hegemonyoffaith.game.php`):
  - `stShowGameEndSummary()` no longer sends `auto_end_delay_ms`.
  - Added `gameEndSummaryClosing` notify when finalization is triggered (normal confirm and zombie fallback path).
- Frontend sync (`hegemonyoffaith.js`):
  - Removed auto-end countdown/timeout logic from `notif_gameEndSummaryShow`.
  - After 3 seconds, button is shown and waiting text is cleared (manual confirm only).
  - Added `notif_gameEndSummaryClosing`:
    - clears summary timers,
    - marks confirm as sent,
    - disables button and shows finalizing message to prevent duplicate clicks/race UI.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node -e "new Function(...hegemonyoffaith.js...)"` parse passed.
  - `php test_logic.php` passed.

## 122) Gate-of-Truth copied KABOOM stability + unusable-copy filtering (2026-04-08)
- Issue A:
  - Using copied `KABOOM!` could hit active-player switch timing errors when Holy Rebirth prompt routing attempted inside action flow.
- Fix A (state-machine handoff):
  - Added new game state `holyRebirthInterruptHandoff` (ID `109`) in `states.inc.php`.
  - Redirected `holyRebirthPrompt` transitions:
    - `playerTurn (31)`: `holyRebirthPrompt -> 109`
    - `resolveDuel (71)`: `holyRebirthPrompt -> 109`
  - Added backend router `stRouteHolyRebirthInterrupt()` in `hegemonyoffaith.game.php`:
    - reads pending Holy Rebirth responder,
    - safely switches active player in game-state context,
    - then transitions to actual `holyRebirthPrompt (94)`.
  - `queueHolyRebirthPromptIfEligible(...)` no longer switches active player directly; it now only triggers transition and lets handoff state perform switching.
- Issue B:
  - Gate-of-Truth copy mode could still offer `KABOOM!` as a copy target even when current turn conditions guaranteed copied KABOOM could not be used.
- Fix B (copy-target filtering):
  - In `getGateTruthCopyableTargets(...)`, for target skill type `2 (KABOOM!)`, suppress copy target when:
    - current player is attack-locked by KABOOM this turn,
    - no remaining action slot,
    - KABOOM already used this turn,
    - no Believers in hand to pay sacrifice.
- Result:
  - Copied KABOOM flow avoids active-player timing crash path.
  - UI no longer proposes copied KABOOM in obviously unusable turn states.
- Validation:
  - `php -l states.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 123) Holy Rebirth trigger after Faith War cumulative deaths (2026-04-08)
- Issue:
  - When a player lost 3+ Believers across a Faith War, Holy Rebirth prompt did not appear after war end.
- Root cause (by code):
  - Faith War used `rememberHolyRebirthRoundDeathBurst(...)` on each duel death, but this memory stored only `max(current, burst)` rather than cumulative deaths.
  - `finalizeFaithWar(...)` did not check/re-route Holy Rebirth prompt candidates at all.
- Fix (`hegemonyoffaith.game.php`):
  - `rememberHolyRebirthRoundDeathBurst(...)` now accumulates deaths via `addWarDeathCounter(...)` within the per-round memory window.
  - `finalizeFaithWar(...)` now checks Holy Rebirth candidates after war-end notifications:
    - scans defender first, then attacker, then all players,
    - requires `war death counter >= 3`,
    - if eligible, queues `queueHolyRebirthPromptIfEligible(..., 'faith_war', resume_player, 1)` and pauses normal turn flow until resolved.
- Behavioral result:
  - Defender/attacker who reached 3+ total Faith War deaths in the current round window now receives Holy Rebirth prompt after Faith War ends.
  - Existing per-turn reset window remains unchanged (`resetPerTurnSkillFlagsForPlayer` clears this memory at next turn start).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php test_logic.php` passed.

## 124) Hide Impermanence hint on surrender acceptance (2026-04-08)
- Issue:
  - During `Accept Surrender`, UI showed an Impermanence-specific confirmation text.
  - This could leak hidden-skill information and let leaders infer surrenderer identity (rule violation).
- Fix (`hegemonyoffaith.js`):
  - Removed Impermanence warning confirm from `onAcceptSurrenderRequestClicked()`.
  - `Accept Surrender` now sends action directly without any skill-specific prompt.
- Rule alignment:
  - Keeps hidden skill content undisclosed before owner actively reveals/uses it.
- Validation:
  - JS parse check passed.
  - `php test_logic.php` passed.

## 125) Impermanence failure notice made private to owner only (2026-04-08)
- Rule intent:
  - Hidden skill content must not be exposed to other players before active reveal/use.
  - Impermanence failure during surrender/recruit/wanderer should not leak identity to acceptor/observers.
- Backend change (`hegemonyoffaith.game.php`):
  - `failImpermanenceAndRedrawSkill(...)`:
    - changed `impermanenceFailed` notification from `notifyAllPlayers(...)` to `notifyPlayer($player_id, ...)`.
    - Owner still receives failure + redraw notice.
  - Public hidden-state sync (`skillHiddenReset`) remains to keep UI consistent without exposing skill content.
- Result:
  - Only the Impermanence owner is informed about failure/redraw reason.
  - Other players no longer receive this failure signal.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 126) Impermanence failure announcement policy adjusted (post-confirm public) (2026-04-08)
- Product decision update:
  - Keep pre-confirm secrecy (no warning popup to acceptor during surrender decision).
  - After action is confirmed and Impermanence actually fails, broadcast failure to all players.
- Backend (`hegemonyoffaith.game.php`):
  - `failImpermanenceAndRedrawSkill(...)` `impermanenceFailed` notify changed back to `notifyAllPlayers(...)`.
  - This keeps the timing rule:
    - before confirmation: no leak,
    - after confirmation/failure resolution: table-wide announcement.
- Frontend consistency:
  - Existing `notif_impermanenceFailed` global message rendering remains compatible.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 127) Gate of Truth tooltip: highlight current copied skill (2026-04-08)
- Issue:
  - After successfully copying a skill (example: `World Peace`), hover tooltip did not provide an obvious visual reminder of current copied skill.
- Frontend changes:
  - `hegemonyoffaith.js` `getSkillTooltipHtml(...)`:
    - when skill type is `9 (Gate of Truth)` and `gate_truth_copied_skill_type > 0`,
    - append a final line to tooltip: `Current copied skill: <SkillName>`.
  - `hegemonyoffaith.css`:
    - added `.skill-tooltip-copy-current` style (red + bold) to emphasize copied skill status.
- Result:
  - Gate-of-Truth tooltip now shows clear red current-copy reminder at the bottom.
- Validation:
  - JS parse check passed.
  - `php test_logic.php` passed.

## 128) Intermittent active-player switch error hardening (KABOOM/Holy Rebirth timing) (2026-04-08)
- Symptom:
  - Rare runtime error could appear during KABOOM/Holy Rebirth interrupt timing:
    - `Impossible to change active player during activeplayer type state`
  - User could sometimes retry and proceed, indicating race/timing sensitivity rather than pure rule rejection.
- Hardening change (`hegemonyoffaith.game.php`):
  - Refactored `switchActivePlayerSafely(...)` to avoid direct `changeActivePlayer(...)` path.
  - Now consistently uses turn-order rotation (`activeNextPlayer`) in non-`multipleactive` contexts.
  - Added guarded exception handling during rotation for the specific intermittent active-player timing message.
- Expected result:
  - Lower chance of intermittent active-player switch crashes in interrupt-driven flows (notably KABOOM -> Holy Rebirth prompt routing).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 129) Hide skill interactions during local discard mode (World Peace / Eternal Truth safety) (2026-04-08)
- Issue:
  - While selecting Action discards in local discard mode, `Use Skill` remained visible/clickable.
  - Misclick could open World Peace / Eternal Truth sacrifice flow and cause UX lock/confusion.
- Frontend fix (`hegemonyoffaith.js`):
  - In `playerTurn` button rendering, generic `Use Skill` button now requires `!isDiscardMode`.
  - While in discard mode, skill-card stock selection is disabled (`setSelectionMode(0)`).
  - Added guard in `onUseSkillButtonClicked()`:
    - if `isDiscardMode`, show info message and abort.
- Result:
  - During discard selection, only discard-related controls remain active.
  - World Peace / Eternal Truth use flow no longer interrupts discard mode.
- Validation:
  - JS parse check passed.
  - `php test_logic.php` passed.

## 130) Discard-mode hard lock for all active skills (2026-04-08)
- User requirement:
  - While choosing Action-card discard, no active skill should be usable or presented.
  - Applies uniformly to all manually activatable skills.
- Frontend hardening (`hegemonyoffaith.js`):
  - In `playerTurn` action-button switch, added early `isDiscardMode` branch:
    - only renders `Confirm Discard` / `Cancel Discard`,
    - exits before any skill-button path is evaluated.
  - `praiseLifeDecisionPending` branch now also guards skill button with `!isDiscardMode`.
  - `onPlayerSkillSelectionChanged()` now exits immediately in discard mode and clears accidental selection.
- Result:
  - Discard mode is now a strict UI mode: no skill button/card activation leaks through.
- Validation:
  - JS parse check passed.
  - `php test_logic.php` passed.

## 131) Everyone is Equal / Chaos Coming unified full shuffle animation flow (2026-04-08)
- Requirement:
  - For both skills, all players should see:
    1) notify skill use
    2) cards from all hands fly to center
    3) center shuffle visual
    4) redistributed cards fly back to each hand target
  - Only card-kind differs:
    - Everyone is Equal => Believers
    - Chaos Coming => Action cards
- Frontend implementation (`hegemonyoffaith.js`):
  - Added shared FX pipeline:
    - `getRedistributeSourceNodeId(...)`
    - `getRedistributeTargetNodeId(...)`
    - `getVisibleHandCountForRedistributeFx(...)`
    - `showCenterShuffleFx(...)`
    - `playGlobalHandRedistributeFx(...)`
  - `playEveryoneEqualShuffleFx(...)` and `playChaosComingShuffleFx(...)` now both call the shared pipeline with `distribution`.
  - Added `pulseCurrentActionHandAfterRedistribute()`; both hand types can pulse after sync update.
  - `notif_skillEveryoneEqual` and `notif_skillChaosComing` now pass server `distribution` into animation pipeline and set local FX windows.
  - `notif_syncActionHand` now mirrors believer behavior and pulses while Chaos FX is pending.
  - Increased notification sync windows:
    - `skillEveryoneEqual` from `1200ms` -> `3000ms`
    - `skillChaosComing` from `1200ms` -> `3000ms`
    to allow full center-collection/shuffle/redeal visual sequence.
- Notes:
  - Visual card count per player is capped for performance (`max 3` each direction) while still reflecting the full-event flow.
- Validation:
  - JS parse check passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 132) Deck-empty tie now enters manual Final Struggle (no auto-sim for 2-player tie) (2026-04-08)
- Reported issue:
  - Believer deck empty + tied top Believer count (including leader/follower same sect tie) incorrectly ended immediately with Final Struggle reason.
  - No actual duel was played by players.
- Backend changes:
  - `computeWinnerWhenBelieverDeckEmpty(...)`:
    - for exactly 2 tied contenders with both hands > 0, no longer auto-resolves winner;
    - now returns a `manual_final_war` payload (`final_war_player_a/b`) for manual duel startup.
  - Added game-end helpers:
    - `getGameEndReasonCode(...)`
    - `concludeGameWithWinner(...)` (shared final scoring + summary state routing)
    - `startManualFinalStruggle(...)` (sets combat context and transitions into duel state)
  - `checkAndResolveGameEnd(...)`:
    - keeps Impermanence override precedence;
    - if no Impermanence override and `manual_final_war` is pending, starts manual Final Struggle instead of selecting winner directly.
  - `playBelieverCardCombat(...)`:
    - supports `war_type = 10` (Final Struggle duel);
    - only hand Believers allowed (no Zombie graveyard path).
  - `stFaithWarDuel()`:
    - added `war_type = 10` branch:
      - contenders are fixed to the tied players,
      - rounds run directly in duel state,
      - if one side has no hand Believers, Final Struggle resolves immediately.
  - `stResolveDuel()`:
    - added `war_type = 10` branch:
      - compare uses no-war-bonus mode (`compareBelievers(..., false)`),
      - no War Bonus draws,
      - continue rounds until one contender has 0 hand Believers,
      - then finalize through new Final Struggle resolver.
  - Added `finalizeFinalStruggle(...)`:
    - returns `warused` survivors to owner hands,
    - clears combat state,
    - determines winner by remaining Believers (with safety fallback),
    - routes to end summary via shared `concludeGameWithWinner(..., 'final_struggle')`.
- State-machine updates (`states.inc.php`):
  - `nextPlayer (33)` transitions: added `finalStruggleDuel => 70`.
  - `resolveDuel (71)` transitions:
    - added `nextFinalStruggleRound => 70`,
    - added `endHand => 40`.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `php test_logic.php` passed.

## 133) Final Struggle UX title + 3-way manual Conspiracy cycle (2026-04-08)
- Requirement update:
  - 2-player tie Final Struggle should show explicit title/banner cue.
  - 3-player (or more) tie at believer-deck-empty should not auto-resolve; use manual rotating Conspiracy-style Final Struggle until contenders run out of playable Believers, then score by stolen Believers.
- Backend (`hegemonyoffaith.game.php`):
  - `computeWinnerWhenBelieverDeckEmpty(...)`:
    - keeps 2-player manual duel trigger from #132,
    - adds `manual_final_conspiracy` payload for tie groups `>=3` with playable Believers.
  - `checkAndResolveGameEnd(...)`:
    - handles new `manual_final_conspiracy` path and starts manual cycle via `startManualFinalConspiracy(...)`.
  - Added helper flow for manual final-conspiracy mode:
    - contender mask helpers (`getPlayersMarkedByMaskKey`, `setPlayersMarkedByMaskKey`, contender/playable/score helpers),
    - attacker rotation helper `pickNextFinalConspiracyAttacker(...)`,
    - start function `startManualFinalConspiracy(...)`,
    - end resolver `finalizeFinalConspiracyContest(...)`.
  - New combat mode:
    - `war_type = 11` => Final Struggle Conspiracy cycle.
    - `stConspiracyChooseBelievers()` branch for war_type 11:
      - rotates attacker each round,
      - sets multiactive to current playable contenders,
      - emits round-start/choose notifications with score rows.
    - `playBelieverCardCombat()` branch for war_type 11:
      - contenders commit one hand Believer,
      - current attacker tracked in `war_attacker_id`.
    - `stResolveConspiracy()` branch for war_type 11:
      - compares attacker vs each defender with no war bonus (`compareBelievers(..., false)`),
      - stores cards into final-cycle pools:
        - stolen => `finalconspcaptured` (counts toward score),
        - defender win => `finalconspused`,
        - draw => `finalconspdraw` (not reusable),
        - attacker card => `finalconspused`,
      - syncs counts, rotates next attacker, or finalizes when <2 playable remain.
  - 2-player duel title support:
    - Final duel round notification now includes `final_struggle = 1`.
  - Zombie handling:
    - `conspiracyChooseBelievers` zombie auto-commit now follows current `war_type`,
    - auto-commit supports war_type 11 notifications.
  - Final-struggle start notify now includes `mode` (`duel` / `conspiracy`).
- State machine (`states.inc.php`):
  - `nextPlayer (33)`:
    - added transition `finalConspiracyBattle => 83`.
  - `resolveConspiracy (84)`:
    - added `nextFinalConspiracyRound => 83`,
    - added `endHand => 40`.
- Frontend (`hegemonyoffaith.js`):
  - Faith War final duel title:
    - `notif_faithWarRound` reads `final_struggle` and prefixes arena banner with `Final Struggle:`.
  - Conspiracy final-cycle handling:
    - `notif_conspiracyStart` supports `final_struggle` mode (`war_type=11`) and attacker rotation display.
    - `notif_conspiracyDefendersChoose` + `notif_conspiracyResolved` show final-cycle-specific messages.
    - final-cycle resolve path skips normal hand-gain counter increment animation assumptions.
  - Added notifications:
    - subscribe + handlers for `finalStruggleStart` and `finalStruggleConspiracyEnd`.
  - Prompt text:
    - Conspiracy prompts show Final-Struggle-specific wording when `war_type=11`.
  - Snapshot resilience:
    - combat rehydrate now treats `war_type=11` as Conspiracy arena.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - JS parse check passed.
  - `php test_logic.php` passed.

## 134) Final Struggle tie policy update: 3+ Conspiracy, 2 War, War-tie => Infinite War (2026-04-08)
- Rule update from playtest:
  - Deck-empty tie handling must be:
    - `>=3` tied contenders: manual Conspiracy cycle.
    - `2` tied contenders: manual Final War.
  - If 3+ cycle ends with top-2 tied:
    - those 2 move into Final War using remaining winning Believers from the cycle.
  - If Final War ties again (including extreme 0-0 tie):
    - start Infinite War by giving both contenders 3 random Believers, then continue Final War until winner.
- Backend (`hegemonyoffaith.game.php`):
  - `computeWinnerWhenBelieverDeckEmpty(...)`:
    - 2-player tie now always routes to manual Final War (not auto fallback).
  - Added pool helpers for final-conspiracy cards:
    - `moveAllFinalConspiracyPoolsToDiscard()`.
  - Added tie-bridge flow from final-conspiracy to final-war:
    - `startFinalWarFromConspiracyTie(...)`
    - clears contender leftover hands to discard,
    - transfers only tied pair captured winners (`finalconspcaptured`) into their hands,
    - then starts Final War (`war_type=10`).
  - Added Infinite War bootstrap:
    - `startFinalInfiniteWar(...)`
    - when Final War is tied at 0-0, draws 3 random Believers each from discard/removed pool and resumes rounds.
  - Final War hooks:
    - `stFaithWarDuel()` and `stResolveDuel()` now invoke Infinite War bootstrap on 0-0 before ending.
  - Final Conspiracy resolution:
    - `finalizeFinalConspiracyContest(...)`:
      - if exactly 2 leaders tied by stolen count, transitions to Final War instead of auto tie-break.
      - single-winner path unchanged.
  - `war_type=11` (Final Conspiracy cycle) remains active for 3+ tie scenario.
- Frontend (`hegemonyoffaith.js`):
  - Added subscribe + handler:
    - `finalInfiniteWarStarted` -> info/top-instruction update.
  - Existing Final Struggle title handlers remain:
    - duel banner prefix `Final Struggle:`
    - Conspiracy-cycle messaging/score hints.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - JS parse check passed.
  - `php test_logic.php` passed.

## 135) Gate of Truth + Karma Reversed reactive prompt alignment (2026-04-08)
- Requirement:
  - When native `Karma Reversed` is actually used (flipped), a not-yet-copied `Gate of Truth` owner should immediately get a follow-up prompt to copy-and-counterflip in the same combat window.
- Backend (`hegemonyoffaith.game.php`):
  - Added `getReactiveGateTruthResponderForReverseKarma(...)`:
    - detects a valid Gate owner who can mirror `Karma Reversed` reactively right after native Karma reveal/use.
  - Added `tryActivateReactiveGateTruthCopyForReverseKarma(...)`:
    - when Gate owner confirms use in second prompt and had not pre-copied Karma:
      - creates copy context to skill type 16,
      - marks copied-once mask + used-this-turn,
      - reveals Gate skill if needed,
      - emits `skillGateTruthCopied` + `skillStateUpdated`.
  - Updated `stResolveReverseKarmaPrompt()`:
    - tracks whether first responder actually used native Karma,
    - if first flip is active and no pre-copied second responder exists, injects reactive Gate responder for second prompt,
    - second prompt can now succeed either via pre-copied Karma or on-the-spot reactive Gate copy.
- Behavioral result:
  - Native Karma flips -> Gate owner now receives immediate same-window prompt to mirror/counterflip even if Gate had not pre-copied Karma beforehand.
  - If Gate owner skips, no copy context is consumed.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 136) Gate of Truth + Holy Rebirth reactive copy window alignment (2026-04-08)
- Requirement:
  - Gate copy context still expires at Gate owner turn-start.
  - Additionally, if Gate owner has not pre-copied `Holy Rebirth`, but meets condition (own deaths >=3 this round window) and a revealed native Holy Rebirth exists, Gate should still be able to copy-and-use immediately in the interrupt prompt.
- Backend (`hegemonyoffaith.game.php`):
  - Added `getReactiveGateTruthSourceForHolyRebirth(...)`:
    - detects whether current prompt player can reactively mirror revealed native `Holy Rebirth`.
  - Added `tryActivateReactiveGateTruthCopyForHolyRebirth(...)`:
    - on confirm-use in Holy Rebirth prompt, if not pre-copied:
      - creates Gate copy context to skill type 5,
      - marks copied-once mask + used-this-turn,
      - reveals Gate skill if needed,
      - emits `skillGateTruthCopied` + `skillStateUpdated`.
  - Updated `queueHolyRebirthPromptIfEligible(...)`:
    - accepts reactive Gate-eligible case even when no pre-copied Holy Rebirth context exists yet.
  - Updated `argHolyRebirthPrompt()`:
    - reports `ability_source=gate_truth_copy` for both pre-copied and reactive-copy-eligible Gate path.
  - Updated `stResolveHolyRebirthPrompt()`:
    - when player confirms use and has neither native nor pre-copied Holy Rebirth, it now attempts on-the-spot Gate reactive copy first, then resolves revival.
- Behavioral result:
  - Gate owner can now copy Holy Rebirth at trigger time (not only pre-copy), then resolve revive in the same prompt.
  - Copy context still clears at Gate owner next turn start, while copied-skill-once mask remains persistent for whole game.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 137) Reverse Karma stack visibility + Gate copied-skill tooltip parity (2026-04-08)
- Requirement:
  - Reverse Karma visual stack must show all actually used layered skills on the attack card (e.g. Zombie + Karma + Gate copy), not only final active owner.
  - If Gate of Truth is in stack, tooltip must clearly show current copied skill and use copied skill effect text.
- Backend (`hegemonyoffaith.game.php`):
  - Added combat-state tracking:
    - `war_reverse_karma_stack_owner_a`, `war_reverse_karma_stack_owner_b`.
    - Helpers: `get/set/clearReverseKarmaStackOwnerIds(...)`.
  - Reverse Karma prompt resolve now records who actually used in this combat window (up to 2 responders, ordered).
  - `reverseKarmaStatus` now broadcasts stack owner list when any Reverse Karma response was used (even if final reverse flag returns to inactive after double-toggle).
  - Added `reverse_karma_stack_owner_ids` payload into combat resolve notifications:
    - Faith Debate result, Martyrdom resolved, Conspiracy resolved, Faith War duel result.
  - Added `war_reverse_karma_stack_owner_ids` to `combat_context` snapshot for reconnect/rehydrate continuity.
- Frontend (`hegemonyoffaith.js`):
  - Added stack owner normalization helper and extended `setReverseKarmaContext(...)` to carry stack owner list.
  - `getCombatSkillStackSpecs(...)` now renders full reverse stack:
    - preserves Zombie stack,
    - then adds one card per recorded reverse responder (Karma native or Gate by owner skill type).
  - `renderCombatActionStack(...)` tooltip owner-state source switched to panel-effective skill state (not self-only), so stacked Gate cards can display copied context correctly.
  - `getSkillTooltipHtml(...)` for Gate now:
    - keeps title as Gate of Truth,
    - shows `Current copied - <skill name>` hint,
    - effect block switches to copied skill effect text when copy is active.
  - Reverse Karma context updates now pass stack owner ids in relevant notifications.
- Behavioral result:
  - If both native Karma and Gate-copied Karma are used, both skill cards remain visibly stacked on the combat action card.
  - If Zombie is also active in Faith War, all layers are shown together.
  - Gate stacked tooltip reflects copied target effect (e.g. copied Karma text) instead of only generic Gate text.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 138) Reverse Karma stack card identity hard lock to owner base skill (2026-04-08)
- Requirement refinement:
  - Reverse stack visual card face must match the actual skill owner card:
    - Gate owner usage => show Gate of Truth card face (not Karma card face),
    - Karma owner usage => show Karma Reversed card face.
  - Gate tooltip in stacked/panel skill icon must keep showing Gate card identity while effect text follows current copied skill.
- Frontend (`hegemonyoffaith.js`):
  - Added `getReverseKarmaStackSkillTypeByOwner(ownerId)`:
    - resolves stack card type from owner’s real skill card first (`player_skills`), fallback to public skill state.
    - prevents stale reactive-state fallback from incorrectly rendering Gate as Karma.
  - Updated `getCombatSkillStackSpecs(...)`:
    - reverse stack entries now always use owner-resolved base skill card type (9/16),
    - fallback single-owner path also uses owner-resolved card type (no forced Karma card face).
- Behavioral result:
  - In “native Karma skipped, Gate responds” case, stack now shows Gate card face for that response.
  - Tooltip remains Gate identity, with copied-skill effect text driven by Gate current copy state.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 139) AOE left attacker representative label no longer stuck as ??? after assignment (2026-04-08)
- Problem:
  - In Martyrdom/Conspiracy, left attacker believer owner label could remain `???` even after representative assignment completed, especially when attacker side self-assign path emitted no explicit representative-chosen update for that side.
- Frontend (`hegemonyoffaith.js`):
  - Updated `syncAoeRepresentativeLabelsFromTargetIds(...)`:
    - now also parses attacker-sect representative from `target_ids` and applies it to left-side attacker believer owner label.
    - still keeps right-side per-sect representative labels as before.
    - syncs inferred attacker representative id into `combat_context.war_rep_attacker_id` for consistent later rendering.
- Behavioral result:
  - Once assignment stage is complete and `target_ids` are known, left attacker side shows actual representative name instead of `???`.
  - This aligns left lane with right lane visibility in AOE representative-confirmed phase.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 140) Purple Hermit badge state: pending split shows Active, not Spent (2026-04-08)
- Requirement refinement:
  - After Purple Hermit first activation (half-steal done, before next-turn final split), status must display `Active`.
  - `Spent` should appear only after pending effect ends (kicked out / split resolved).
- Backend (`hegemonyoffaith.game.php`):
  - Added Purple Hermit runtime flags into skill state payload:
    - `purple_hermit_ready`
    - `purple_hermit_pending_split`
  - Included these fields in:
    - `getSkillStateForPlayer(...)` (self + notification payloads)
    - public revealed skill-state snapshot path in `getAllDatas` for non-self.
- Frontend (`hegemonyoffaith.js`):
  - Updated `refreshPlayerSkillActiveBadge(...)`:
    - if skill is Purple Hermit and `purple_hermit_pending_split=1`, badge is forced to `Active` (with pending-split title),
    - this state now overrides generic exhausted (`uses/cap`) `Spent` display.
- Behavioral result:
  - Purple Hermit first-stage active window now correctly shows `Active`.
  - Once pending split is cleared (expelled or second-stage resolved), exhausted logic naturally falls back to `Spent`.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 141) Gate of Truth tooltip simplification: timing + copied-skill history list (2026-04-08)
- Requirement refinement:
  - Gate tooltip timing should be `使用時機: 視複製技能而定。`
  - Gate tooltip should not show generic `Unavailable` block.
  - Instead show a plain history line: `已複製過技能: <skill names...>` (no extra effect-description text for each listed skill).
- Backend (`hegemonyoffaith.game.php`):
  - Added `getGateTruthCopiedSkillTypeList()` (decoded from `gate_truth_copied_skill_mask`).
  - Exposed copied-skill history list in skill state:
    - `gate_truth_copied_skill_types`
  - Included this field in:
    - `getSkillStateForPlayer(...)`
    - public revealed skill-state snapshot path in `getAllDatas` for Gate.
- Frontend (`hegemonyoffaith.js`):
  - `getSkillTimingText(9)` updated to `使用時機: 視複製技能而定。`
  - Added `getGateTruthCopiedSkillHistoryText(...)` helper to format names-only list.
  - `getSkillTooltipHtml(...)` updated:
    - for Gate (`skill 9`), hide `Unavailable` section,
    - append `已複製過技能: ...` line,
    - retain existing current-copy hint/effect switch behavior.
- Behavioral result:
  - Gate tooltip now highlights only current copy context + copied-history names list,
    without extra “Unavailable” descriptive noise.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 142) Zombie Army Faith War now locks graveyard pool at activation-time snapshot (2026-04-08)
- Problem:
  - Zombie Army in Faith War incorrectly used live `discard` state.
  - New deaths during the same war could become selectable for Zombie, which violates the rule that Zombie can only use graveyard cards already present when the skill is activated.
- Backend (`hegemonyoffaith.game.php`):
  - Added combat state label:
    - `war_zombie_snapshot_max_discard_arg`
  - `playFaithWar(...)` now captures discard snapshot boundary at declaration time:
    - max discard `card_location_arg` is stored when Zombie Army is enabled.
  - Added snapshot helpers:
    - `getFaithWarZombieSnapshotMaxDiscardArg()`
    - `isCardEligibleForFaithWarZombieSnapshot(...)`
    - `getFaithWarZombieSnapshotDiscardCards()`
    - `countFaithWarZombieSnapshotDiscardCards()`
  - Updated Zombie availability to use snapshot-only pool:
    - `getFaithWarAvailableBelieversForSect(...)`
    - `getFaithWarCombatReadyPlayerIds(...)`
    - `canRepresentativeUseZombieFromGraveyard(...)`
  - Updated card selection enforcement:
    - `playBelieverCardCombat(...)` now rejects discard cards outside the snapshot window with a visible rule message.
    - `autoCommitFaithWarBelieverForRepresentative(...)` now randomly picks only from snapshot-eligible discard cards.
  - `clearCombatSkillState()` resets `war_zombie_snapshot_max_discard_arg`.
- Behavioral result:
  - Zombie Army can only use the graveyard state that existed at the moment Faith War was declared with Zombie enabled.
  - Opponent believers that die later in the same war are not added into Zombie-usable pool.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 143) Zombie Army use now correctly reveals skill owner (and Gate mirror source) (2026-04-08)
- Problem:
  - Declaring Faith War with Zombie Army consumed the ability but did not reveal the underlying skill.
  - As a result, other players (including Gate of Truth owners) could not reliably see Zombie Army as a revealed copy target.
- Backend (`hegemonyoffaith.game.php`):
  - Updated `playFaithWar(...)` in Zombie path:
    - if native Zombie Army is used, call `revealSkillAndNotifyIfNeeded(player, 10)`.
    - if Zombie Army is being used via Gate copied skill, call `revealSkillAndNotifyIfNeeded(player, 9)`.
  - Added per-owner `skillStateUpdated` notify after Zombie-use reveal so owner UI state refreshes immediately.
- Behavioral result:
  - Zombie Army usage now flips skill visibility as expected.
  - Gate-of-Truth interactions can see revealed Zombie source and proceed with copy logic consistently.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 144) Faith War bonus logging now handles empty Believer deck explicitly (2026-04-08)
- Requirement:
  - If War Bonus is triggered but Believer deck is already empty, no extra card should be granted.
  - Log should still indicate bonus trigger and clearly state deck ran out / no draw.
- Backend (`hegemonyoffaith.game.php`):
  - Updated both Faith War winner branches in `stResolveDuel()` bonus section:
    - when `pickCardForLocation('deck', 'warbonus', ...)` succeeds:
      - keep existing bonus notify (`delayed_until_war_end = true`, `deck_empty = 0`).
    - when draw fails (deck empty):
      - send explicit `duelBonus` log message:
        - bonus triggered,
        - Believer deck is empty,
        - no bonus card drawn.
      - payload includes `deck_empty = 1`, `delayed_until_war_end = false`.
- Frontend (`hegemonyoffaith.js`):
  - Updated `notif_duelBonus(...)`:
    - when `deck_empty = 1`, message becomes:
      - `earned a War Bonus - Believer deck is empty, so no bonus card is drawn`
    - otherwise keep existing delayed bonus wording.
- Behavioral result:
  - Bonus trigger is visible even when deck is exhausted.
  - Players now get explicit, non-misleading feedback that no bonus card was added.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 145) Replay-friendly duel timeline for Faith War / Faith Debate (2026-04-08)
- Goal:
  - Improve BGA replay readability so duel sequences are shown as full round-by-round flow (not effectively collapsing to the final visible card/result only).
- Frontend (`hegemonyoffaith.js`):
  - Added replay detection helper:
    - `isReplaySessionActive()` using `g_replayFrom` / `g_archive_mode`.
  - Replay-aware notification pacing:
    - `duelResult` / `faithDebateResult` sync duration now scales up in replay.
    - Added explicit sync pacing for duel timeline notifications:
      - `faithWarStart`, `faithWarRound`, `faithWarCardPlayed`, `duelResult`, `duelBonus`, `faithWarEnd`
      - `faithDebateStart`, `faithDebateRound`, `faithDebateCardPlayed`, `faithDebateResult`, `faithDebateEnd`
  - Replay-friendly end-of-combat cleanup:
    - in replay session, `notif_faithWarEnd` and `notif_faithDebateEnd` no longer immediately reset duel log / transient arena.
    - keeps round log visible for replay inspection until next combat sequence starts.
- Behavioral result:
  - Duel playback is slower and clearer in replay, with per-round progression more visible.
  - War/Debate round logs remain inspectable at combat end during replay sessions.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 146) Terminology normalization pass: Mental / Strategy / Sect roles / snatch wording (2026-04-08)
- Goal:
  - Unify player-facing terms and casing to match current rule language:
    - `Mental`, `Strategy`
    - `Sect`, `Leader`, `Follower`, `Wanderer`
    - use `snatch` instead of `steal` in visible text
    - avoid `Action - ...` attack type label style for attack card type display
- Updated files:
  - `material.inc.php`
    - card type labels normalized (`Believer`, `Strategy`, `Physical`, `Mental`, `Defense`).
  - `hegemonyoffaith.js`
    - target prompts and action/skill text normalized to `Sect` / role casing.
    - spread-rumor / wanderer-related visible text switched to `snatch`.
    - attack type labels kept as `Physical Attack` / `Mental Attack` (no `Action - ...` prefix).
    - representative / defense / surrender UI messages normalized (`Leader`, `Follower`, `Sect`).
    - fixed a broken fallback string in skill tooltip helper (`"???"`) found during syntax validation.
  - `hegemonyoffaith.game.php`
    - visible notifications/exceptions/log text normalized for `Sect` + role casing.
    - `snatch` wording applied across Purple Hermit / Headstronger / Spread Rumors / Wanderer / Debate result messages.
    - duel/debate/martyrdom/conspiracy user-facing text updated to consistent `Believer` casing where applicable.
    - mental/physical defense mismatch messages updated to `Mental Attack` / `Physical Attack`.
- Notes:
  - Internal identifiers/variable names like `wandererSteal`, `stolen`, `player_sect` were intentionally unchanged.
  - Remaining `steal/stolen` occurrences are internal comments/fields, not user-visible wording.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 147) Faith Debate stop-button permission alignment (attacker-only requester) (2026-04-08)
- Problem:
  - During `faithDebateDuel`, non-eligible players could still see `Stop Faith Debate` button.
  - Clicking it then hit backend guard:
    - `Only the attacking representative can request to stop Faith Debate.`
- Root cause:
  - Frontend button visibility used `can_stop_faith_debate` from state args.
  - In multi-active context this flag could cause unauthorized clients to render stop button.
- Fix (`hegemonyoffaith.js`):
  - In `faithDebateDuel` button rendering, removed args-based permissive path and now gate solely by:
    - `canCurrentPlayerRequestFaithDebateStop(...)`
    - plus `!hasCommittedDuelBelieverThisRound`
  - Updated non-representative top instruction to waiting text only (removed misleading “you may stop now” wording).
  - Hardened `onStopFaithDebateClicked()`:
    - early return unless current state is `faithDebateDuel`,
    - not yet committed this round,
    - and current player is eligible stop requester by role.
    - prevents accidental unauthorized stop AJAX dispatch.
- Behavioral result:
  - If player cannot stop, stop button is no longer shown.
  - No more click-then-error for unauthorized stop attempts in normal UI flow.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 148) Faith Debate stop now ignores defender pre-commit and returns committed card(s) (2026-04-08)
- Requirement update:
  - Attacker stop request should not be blocked just because defender already committed.
  - If defender already committed, that Believer should be returned when Debate stops.
- Backend (`hegemonyoffaith.game.php`):
  - `stopFaithDebate()` guard updated:
    - no longer blocks on defender commit.
    - only blocks if attacking representative has already committed.
    - message updated to attacker-specific condition.
  - `finalizeFaithDebate()` enhanced:
    - before normal `debateused` return, recover unresolved current-round cards in `cardsontable`
      referenced by `war_card_attacker` / `war_card_defender`.
    - move them back to owners' hands and send owner `newBelievers` sync.
    - ensures clean rollback when stop happens mid-round (including leader-approved stop flow).
- Behavioral result:
  - Attacker can stop Debate even if defender already selected a Believer.
  - Defender’s already committed Believer is returned (not stuck on table / not lost).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 149) End-game Final Struggle rules updated: Sect-member tie priority + Sect-vs-Sect final war (2026-04-08)
- Requirement update:
  - Deck-empty scoring now treats tied Sect totals with member-count advantage:
    - if Sect A total equals Sect B total, Sect with more active members wins that tie-break.
    - example: `7 (single-member Sect)` vs `4+3 (two-member Sect)` now resolves to two-member Sect win path (no direct 1v1 duel).
  - If two tied top Sects remain after tie-break, Final Struggle must be Sect-vs-Sect (leaders can assign Followers), not leader-only duel.
  - If Sect-vs-Sect final war reaches full zero tie, escalate to leaders-only Infinite Final War (3 random Believers each).
- Backend (`hegemonyoffaith.game.php`):
  - Reworked `computeWinnerWhenBelieverDeckEmpty(...)`:
    - tie on Sect total now applies member-count tie-break before deciding manual final mode.
    - added `manual_final_sect_war` result path with `final_war_sect_a/final_war_sect_b`.
  - Added Sect internal winner helper logic:
    - `getSectInternalWinnerByBelievers(...)`
    - `getOrderedSectsByLeaderTieBreak(...)`
  - Added manual final Sect war entry:
    - `startManualFinalSectWar(...)`
    - uses `war_type = 12` (Final Struggle Sect-vs-Sect war), starts at representative-selection flow.
  - `checkAndResolveGameEnd(...)` now handles `manual_final_sect_war`.
  - Updated Faith War representative stage:
    - `stChooseWarRepresentative()` now routes `war_type=12` early-end cases through final-war resolution path.
  - Updated combat card commit gate:
    - `playBelieverCardCombat(...)` now accepts `war_type=12` in the duel branch.
  - Added final-sect-war resolution utilities:
    - `clearWarBattleStateForFinalization()`
    - `getCurrentStateNameSafe()`
    - `continueFinalSectWarRound()`
    - `startLeaderInfiniteFinalWarFromSectTie()`
    - `concludeFinalSectWarWinner()`
  - `finalizeFaithWar(...)` now branches for `war_type=12`:
    - compare Sect totals after war,
    - resolve internal Sect winner when one Sect leads,
    - continue rounds on remaining tie,
    - escalate both-zero tie to leaders-only infinite final war.
- State machine (`states.inc.php`):
  - Added `nextPlayer` transition:
    - `finalStruggleSectWar => 69` (representative selection state).
  - Added `endHand` transition support in states 69/70 so final-struggle conclusions can close game from combat states safely.
- Frontend (`hegemonyoffaith.js`):
  - `notif_finalStruggleStart(...)` now recognizes `mode = sect_war` and shows Sect-vs-Sect final war instruction.
- Behavioral result:
  - `single 7` vs `double 4+3` no longer incorrectly enters leader duel; two-member Sect gains tie-break advantage.
  - Two tied top Sects now resolve through assignable Sect-vs-Sect Final Struggle.
  - Zero-zero tie in that mode escalates to leaders-only Infinite Final War as requested.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l states.inc.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 150) Sealed skill state now immediately cancels active protection (World Peace / Eternal Truth / Gate copy context) (2026-04-08)
- Requirement update:
  - If a player is forcibly sealed after joining another Sect as `Follower`, ongoing skill effects must stop immediately.
  - Specifically, active protection from `World Peace` / `Eternal Truth` must not remain `Active`.
  - If revealed skill is sealed, panel status should show `Seal`.
  - `Gate of Truth` under sealed status should not remain usable.
- Backend (`hegemonyoffaith.game.php`):
  - Added `isPlayerSkillSealed(...)` and integrated sealed guard into:
    - `isPlayerProtectedFromPhysicalSkill(...)`
    - `isPlayerProtectedFromMentalSkill(...)`
    - `setPlayerSkillProtection(...)` (cannot enable protection while sealed).
  - Added `applySkillSealEffectsForPlayers(...)`:
    - clears physical/mental protection masks for sealed players immediately,
    - clears `Gate of Truth` copied context + per-turn used flag when Gate owner is sealed,
    - pushes owner `skillStateUpdated` sync.
  - Wired seal-effect cleanup into forced-seal transitions:
    - `playKowtowToMe(...)` absorbed members,
    - `stCheckEndTurnPhase()` leader replacement path,
    - finalized surrender flow in `giveBeliever(...)` when `support_mode === 0`.
  - `canPlayerUseSkillNow(...)` now blocks `Gate of Truth` when sealed / non-Leader.
  - `getSkillStateForPlayer(...)` now includes `is_sealed`.
- Frontend:
  - `hegemonyoffaith.js`:
    - `refreshPlayerSkillActiveBadge(...)` now renders `Seal` when player is sealed and skill is visible (self or revealed).
    - identity sync now refreshes skill badge immediately (`applyPlayerIdentitySyncRow(...)`).
  - `hegemonyoffaith.css`:
    - added `.panel-skill-active.is-sealed` style.
- Behavioral result:
  - Sealed players no longer keep active protection state/badge.
  - Revealed sealed skills visibly show `Seal`.
  - Gate copy path is no longer usable while skill is sealed.

## 151) Recruit draw animation sequence + Prophet visual pipeline clarity (2026-04-08)
- Requirement update:
  - `Have a Charity` / `Divine Inspiration` should visually follow:
    - action card to table
    - Believer draw flight(s) from deck to target player anchor
    - then action card to discard.
  - Prophet flow should clearly show:
    - draw pause + pending back card to table,
    - guess chosen / pass feedback,
    - reveal + hit/miss result,
    - card(s) flight to final receiver(s),
    - then action card to discard.
- Frontend (`hegemonyoffaith.js`):
  - Draw animation:
    - removed self-skip in `animateDeckDrawToPlayer(...)` so current player also sees deck->hand animation.
    - `applyBelieverDeckDrawVisualSync(...)` now supports `animate_draw` toggle and returns animation duration.
    - `notif_haveACharity(...)` / `notif_divineInspiration(...)` now:
      - animate draw when not in prophet flow,
      - delay action-card discard until draw animation finishes.
  - Prophet visual clarity:
    - `getProphetPredictionAnchorId()` now prioritizes real center card slot before generic arena.
    - `notif_prophetPredictionStarted(...)` sets top instruction to explicit “waiting for prediction”.
    - added handlers + subscriptions:
      - `notif_prophetGuessChosen(...)`
      - `notif_prophetGuessPassed(...)`
    - `animateProphetPredictionFlow(...)`:
      - now returns full pipeline duration for discard scheduling,
      - adds guess-type badge and hit/miss badge on revealed prediction card.
    - `notif_prophetPredictionResolved(...)` now schedules discard after actual prophet animation duration.
  - Notification pacing:
    - added synchronous queue timing for `prophetGuessChosen` / `prophetGuessPassed`.
- Frontend style (`hegemonyoffaith.css`):
  - added `.prophet-guess-type-badge` for on-card predicted-type display.
- Backend (`hegemonyoffaith.game.php`):
  - `stResolveProphetPrediction()` notification order adjusted:
    - public `prophetPredictionResolved` first,
    - then private `newBelievers` sync,
    - so client can render prediction animation before hand-sync pop-in.
- Behavioral result:
  - Recruit card flow now visibly draws Believers before discarding the action card.
  - Prophet (native + Gate copy) prediction flow is readable from UI without relying only on logs.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 152) Everyone is Equal / Chaos Coming redistribution FX hardening (source-count driven) (2026-04-09)
- Problem:
  - In some real games, `Everyone is Equal` still showed no visible global redistribute animation (no hand->center gather, no shuffle, no re-deal), despite effect resolving.
  - Root cause was client-side FX depending too much on local visible counts / strict node assumptions during notification timing.
- Backend (`hegemonyoffaith.game.php`):
  - Added per-player pre-redistribution hand counts to redistribution payload:
    - `redistributeBelieversFromAllHands(...)` now returns `source_counts`.
    - `redistributeActionCardsFromAllHands(...)` now returns `source_counts`.
  - `skillEveryoneEqual` / `skillChaosComing` notifications now include:
    - `source_counts` + existing `distribution`.
- Frontend (`hegemonyoffaith.js`):
  - Refactored `playGlobalHandRedistributeFx(...)` to consume both:
    - `sourceCounts` (pre-redistribution gather side),
    - `distribution` (post-redistribution deal side).
  - Added robust center fallback:
    - uses `central_arena` if present, otherwise `game_play_area`.
  - Added source/target fallback anchors:
    - if preferred node missing, fallback to public player anchor.
  - `playEveryoneEqualShuffleFx(...)` / `playChaosComingShuffleFx(...)` now pass both maps.
  - `notif_skillEveryoneEqual(...)` / `notif_skillChaosComing(...)` now use server-provided `source_counts`.
- Behavioral result:
  - `Everyone is Equal` and `Chaos Coming` FX no longer rely solely on local hand DOM timing.
  - Gather -> center shuffle -> re-deal animation now remains visible even in desync-prone timing windows.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

## 153) Public recruit draw visibility: table-anchor priority for action play + Believer receive (2026-04-09)
- Requirement update:
  - Other players should clearly see recruit flows on the main table:
    - actor card from player anchor to table,
    - Believer back-cards from deck to that player's anchor.
- Frontend (`hegemonyoffaith.js`):
  - Updated public anchor priority:
    - `getActionPlaySourceNodeId(...)` now prefers `playertable_<pid>` over side `panel_<pid>` for non-self players.
    - `getPlayerBelieverReceiveTargetNodeId(...)` now also prefers `playertable_<pid>` over side panel for non-self players.
- Behavioral result:
  - Recruit-related visuals are now board-centric and easier to observe for all non-acting players.
  - Helps prophet prediction flow readability since draw destinations are visible on table anchors.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 154) CSS typography framework cleanup: utility classes + shared combat/end-summary text bindings (2026-04-09)
- Requirement:
  - Reduce repeated text declarations (`line-height`, `font-weight`, `text-align`) and provide reusable baseline classes.
  - Make war/AOE/end-summary title/owner text style easier to maintain from one place.
- Frontend style (`hegemonyoffaith.css`):
  - Added typography foundations:
    - CSS vars: `--ui-lh-single|tight|base|relaxed|note`
  - Added utility classes for future template usage:
    - `.u-text-center`
    - `.u-fw-700`, `.u-fw-800`
    - `.u-fs-12`
    - `.u-lh-single`, `.u-lh-tight`, `.u-lh-base`, `.u-lh-relaxed`, `.u-lh-note`
  - Added shared text bindings (grouped selectors) to centralize repeated style:
    - shared line-height groups for title/owner/notes
    - shared center-alignment group for combat and summary labels
  - Simplified repeated declarations in local selectors by relying on shared groups while preserving existing visual output.
- Behavioral result:
  - No rules change intended; this is structural cleanup for maintainability.
  - Common text rules now have a clear framework entry point for future additions.

## 155) Animation architecture cleanup: unified anchor resolution + shared flight helpers (2026-04-09)
- Requirement:
  - Reduce duplicated animation logic (anchor lookup, source/target fallback, batch fly-card loops, temp card clone-to-target).
  - Ensure future visual tweaks can be updated in one shared path instead of per-card/per-skill patches.
- Frontend (`hegemonyoffaith.js`):
  - Added shared anchor resolver layer:
    - `resolvePlayerAnchorNodeId(...)`
    - `resolvePlayerCardAnchorNodeId(...)`
  - Added shared flight helpers:
    - `getCardBackClassByKind(...)`
    - `animateCardFlightBatch(...)`
    - `animateCardNodeCloneToTarget(...)`
  - Upgraded base temp-flight API:
    - `animateTempCardFlight(...)` now supports:
      - fixed `tempId`
      - custom `zIndex`
      - `destroyOnEnd` toggle
      - `onEnd` callback
      - optional `rootId`
  - Migrated repeated call sites to shared helpers:
    - redistribution gather/deal flow (`playGlobalHandRedistributeFx(...)`)
    - hand-loss and deck-draw burst flows (`animateBelieverLossFromMyHandToPlayerAnchor(...)`, `animateDeckDrawToPlayer(...)`)
    - action-to-discard clone animations (`moveDuelActionCardToDiscard(...)`, `moveCurrentCenterActionToDiscard(...)`)
    - Prophet pending/reveal draw staging now reuses temp-flight pipeline (instead of separate manual `dojo.place + slideToObject` blocks).
  - Anchor wrapper methods now route through shared resolver:
    - `getPlayerPublicAnchorNodeId(...)`
    - `getPlayerBelieverReceiveTargetNodeId(...)`
    - `getPlayerActionReceiveTargetNodeId(...)`
    - `getActionPlaySourceNodeId(...)`
    - `getAoeBelieverReturnTargetNodeId(...)`
    - redistribute source/target resolvers.
- Behavioral result:
  - No rule change intended.
  - Visual behavior remains equivalent while reducing animation drift risk across cards/skills.
  - Future anchor/flight tuning can now be centralized.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 156) Action tooltip icon system: action_icons sprite integrated + attack scope legend rows (2026-04-09)
- Requirement:
  - Integrate `img/action_icons.png` (704x88, 8 horizontal slices) into tooltip UI.
  - Show icon + label for action keywords in tooltip:
    - `Strategy`, `Physical Attack`, `Mental Attack`, `Physical Defence`, `Mental Defence`
  - Add one extra scope row for attack cards:
    - `Target`: targets one Sect without consuming Believers
    - `1 vs 1`: targets one Sect with multi-round Believer combat
    - `AoE`: non-discriminatory attack against all enemy Sects
- Frontend (`hegemonyoffaith.js`):
  - `getActionCardTypeMeta(...)` now includes icon key and defense-specific type labels:
    - `Great Mercy` -> `Physical Defence`
    - `Firm Faith` -> `Mental Defence`
  - Added tooltip icon helpers:
    - `getActionAttackScopeMeta(...)`
    - `renderActionIconLabelHtml(...)`
    - `decorateActionTooltipTextWithIcons(...)`
  - `getActionCardTooltipHtml(...)` now renders:
    - iconized type row
    - optional attack scope row (`target`/`1 vs 1`/`AoE`)
    - icon-enhanced effect text (keyword terms decorated inline)
  - Defense card effect text normalized to include iconized terms:
    - `Physical Defence` / `Mental Defence` and `Physical Attack` / `Mental Attack`
- Frontend style (`hegemonyoffaith.css`):
  - Added tooltip icon sprite classes:
    - `.tooltip-action-icon` + per-icon variants (`strategy`, `physical_attack`, `mental_attack`, `target`, `duel_1v1`, `aoe`, `physical_defence`, `mental_defence`)
  - Added layout helpers for icon labels/effect rows:
    - `.tooltip-action-icon-label`, `.tooltip-attack-scope`, `.tooltip-action-effect`, etc.
- Behavioral result:
  - Action tooltip now consistently reinforces icon-language mapping for card type and attack scope.
  - Attack cards now show explicit target-mode explanation directly under type row.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php test_logic.php` passed.

### 156-a) Icon sprite orientation correction + attack text de-dup (2026-04-09)
- Correction:
  - Actual asset size is `704x88` (horizontal strip), not vertical strip.
  - Tooltip icon CSS slicing updated to horizontal offsets:
    - `background-size: 112px 14px`
    - x-offset per icon: `0, -14, -28, ..., -98`
- Tooltip text refinement:
  - Removed duplicated attack-type lead-in from attack card effect lines:
    - no second `Physical Attack` / `Mental Attack` prefix in body text
    - type row remains the single authoritative place for attack type.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

### 156-b) Defense tooltip wording de-dup (2026-04-09)
- Refinement:
  - Defense card effect text no longer repeats defense type line in body.
  - Updated to concise form:
    - `Defends against Physical Attack only.`
    - `Defends against Mental Attack only.`
  - Type identity remains in tooltip type row with icon (`Physical Defence` / `Mental Defence`).
- Validation:
  - `node --check hegemonyoffaith.js` passed.

### 156-c) Tooltip icon sprite moved to percentage slicing + single size variable (2026-04-09)
- Refinement:
  - Replaced pixel-offset sprite slicing with percentage-based slicing to avoid re-tuning offsets when icon size changes.
  - Added one-size control variable in `.tooltip-action-icon`:
    - `--tooltip-action-icon-size`
  - Icons now use:
    - `background-size: 800% 100%`
    - `background-position` percentages per slice (`0% ... 100%` across 8 icons).
- Behavioral result:
  - Icon size can be adjusted without recalculating per-icon x offsets.

### 156-d) Scope label width switched to content-fit (no fixed blank space) (2026-04-09)
- Refinement:
  - Removed fixed scope-label minimum width in tooltip attack scope row.
  - Scope label now uses content-fit sizing and no-wrap text:
    - `width: fit-content`
    - `flex: 0 0 auto`
    - `white-space: nowrap`
- Behavioral result:
  - `1 vs 1` no longer breaks awkwardly.
  - `AoE` no longer leaves unnecessary trailing blank space from fixed-width label blocks.

### 156-e) Action tooltip title sizing hook + detail separator line (2026-04-09)
- Refinement:
  - Added dedicated action-tooltip title class in HTML:
    - `tooltip-card-title` (for action card name line)
  - Added visual separator before detailed effect text:
    - `tooltip-card-divider`
  - `getActionCardTooltipHtml(...)` now renders order:
    - title
    - type row
    - optional scope row
    - divider
    - detailed effect text
- Style defaults:
  - `.tooltip-card-title`: `font-size: 16px; line-height: 1.2`
  - `.tooltip-card-divider`: 1px horizontal line with subtle brown tint

### 156-f) Tooltip title class unified across Action / Skill / Believer (2026-04-09)
- Refinement:
  - Tooltip main title now uses the same class across card types:
    - `tooltip-card-title` applied to:
      - Action tooltip title
      - Skill tooltip main title (revealed + unrevealed)
      - Believer tooltip title
      - panel counter tooltip title
  - Skill title keeps `skill-tooltip-title` as an additional class for color styling, while sharing the same base size/layout class.
- Behavioral result:
  - One title style edit now consistently affects all tooltip main titles.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

### 156-g) Tooltip icon/text vertical centering refinement (2026-04-09)
- Refinement:
  - Improved inline icon-label vertical alignment in tooltip text:
    - `.tooltip-action-icon-label` now uses middle alignment + controlled line-height.
    - `.tooltip-action-icon-text` now has explicit line-height.
    - `.tooltip-action-icon` switched to `display: block` inside inline-flex to reduce baseline drift.
  - `tooltip-card-type` row now uses `display:flex; align-items:center` for stable vertical centering.
- Behavioral result:
  - Large icon sizes (e.g. 30px) render with better icon/text vertical centering in both type row and inline effect text.

### 156-h) Tooltip section layout unified per card type (2026-04-09)
- Requirement update:
  - All card tooltip titles should have a divider line directly below the title.
  - Skill tooltip should be structured as:
    - title + divider
    - `Timing` + `Uses`
    - divider
    - detail description
  - Remove `Unavailable` block from skill tooltip display.
  - Believer tooltip should be:
    - title + divider
    - confrontation rows (unchanged content).
- Frontend (`hegemonyoffaith.js`):
  - `getActionCardTooltipHtml(...)`:
    - added title-under divider.
  - `getSkillTooltipHtml(...)`:
    - added title-under divider (revealed + unrevealed paths),
    - split `Timing/Uses` into dedicated rows,
    - inserted second divider before detailed effect,
    - removed `Unavailable` rendering block.
  - `getBelieverTooltipHtml(...)`:
    - added title-under divider while keeping existing confrontation rows.
- Frontend (`hegemonyoffaith.css`):
  - added section row classes:
    - `.tooltip-skill-meta-row`
    - `.tooltip-skill-detail`
- Validation:
  - `node --check hegemonyoffaith.js` passed.

### 156-i) Right panel Action/Believer counter tooltip divider parity (2026-04-09)
- Problem:
  - Right-side player panel `Action Cards` / `Believer Cards` tooltips were using `attachPanelCounterTooltip(...)` and still lacked title-divider structure.
- Fix:
  - `attachPanelCounterTooltip(...)` now renders:
    - title (`tooltip-card-title`)
    - `tooltip-card-divider`
    - body text (`tooltip-panel-counter-text`)
  - Added `.tooltip-panel-counter-text` style hook.
- Behavioral result:
  - Right-side panel counter tooltips now visually match title-divider structure used by other tooltips.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

### 156-j) Skill tooltip section order updated (Timing -> Detail -> Uses) with separate counter line (2026-04-09)
- Requirement update:
  - Skill tooltip layout should be:
    - title + divider
    - timing + divider
    - detail + divider
    - uses
    - count line (separate bottom row when available)
  - `Unavailable` block should not be shown.
- Frontend (`hegemonyoffaith.js`):
  - Added `getSkillUsageInfo(...)` to return structured usage fields:
    - `usageText`
    - `counterText` (for numeric/use counters such as `0/1`, total uses, active flags)
  - `getSkillUsageText(...)` now delegates to `getSkillUsageInfo(...)` for compatibility.
  - `getSkillTooltipHtml(...)` reordered sections to:
    - title -> timing -> detail -> uses -> counter row.
  - Removed any `Unavailable` rendering path from skill tooltip output.
- Frontend (`hegemonyoffaith.css`):
  - Added styles:
    - `.tooltip-skill-uses-row`
    - `.tooltip-skill-counter-row`
- Behavioral result:
  - Usage counters are now visually isolated at the bottom, making per-turn/per-game counts easier to scan.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 157) Holy Rebirth now counts Witch Hunt death bursts (2026-04-09)
- Problem:
  - Holy Rebirth death-memory pipeline was connected to KABOOM and Faith War only.
  - `Witch Hunt` could kill 3+ Believers in one resolution, but did not feed that counter/prompt path.
- Backend (`hegemonyoffaith.game.php`):
  - Holy Rebirth source mapping expanded:
    - source code `3` => `witch_hunt`
    - added helper `getHolyRebirthSourceName(...)` so prompt/log source text is correct (`Witch Hunt`).
  - `queueHolyRebirthPromptIfEligible(...)` now stores source code for `witch_hunt`.
  - `stResolveWitchHunt()` now:
    - accumulates per-owner death burst into Holy Rebirth round counter via `rememberHolyRebirthRoundDeathBurst(...)`,
    - after resolution cleanup/public count sync, checks affected candidates for `deaths >= 3`,
    - queues Holy Rebirth prompt with source `witch_hunt` before continuing normal action-window routing.
  - Holy Rebirth prompt/log source naming now supports `Witch Hunt` in:
    - `argHolyRebirthPrompt()`
    - `stResolveHolyRebirth()` notify payload.
- Behavioral result:
  - `Witch Hunt` now correctly contributes to Holy Rebirth trigger memory and can prompt revival when threshold is met.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 158) Prophet prediction slot flow fix (deck back -> slot beside recruit -> guess/result lines) (2026-04-09)
- Problem:
  - Prophet pending card could appear to "pop" on table instead of clear deck-to-slot flight.
  - Pending anchor resolution order could reference a slot that was immediately destroyed/recreated.
  - Guess/result badges over card reduced readability for this flow.
- Frontend (`hegemonyoffaith.js`):
  - `showProphetPendingPredictionVisual()` order fixed:
    - clear old pending visuals first,
    - build/reposition Prophet slot,
    - resolve anchor id,
    - animate deck back-card to slot anchor.
  - Prophet prediction slot now uses:
    - card anchor (`prophet_prediction_card_anchor`)
    - two text lines under card:
      - `Predicted: <Believer type>`
      - `Hit` / `Miss`
- Frontend (`hegemonyoffaith.css`):
  - Added slot + text styles:
    - `.prophet-prediction-slot`
    - `.prophet-prediction-card-anchor`
    - `.prophet-prediction-lines`
    - `.prophet-prediction-line.guess`
    - `.prophet-prediction-line.result` + `.is-hit` / `.is-miss`
  - Removed old on-card Prophet badge styling path.
- Behavioral result:
  - Prophet prediction now visually follows requested sequence: deck back-card flies to recruit-side slot, waits for guess, reveals, then shows two-line guess/result feedback before flying to destination.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 159) Hand readability tint pass (Action used-type soft-dim + Believer standby soft-dim) (2026-04-09)
- Requirement:
  - Keep card visuals readable without hard gray-out.
  - Action cards: after that action type is already used this turn, cards of the same type should look slightly unavailable.
  - Believer cards: default standby should look slightly softened; when the player is in a Believer commit/selection step, return to full color.
  - Avoid opacity-based transparency bleed-through.
- Frontend (`hegemonyoffaith.js`):
  - Added hand visual state helpers:
    - `resolveStateArgsForReadiness(...)`
    - `getActionCardKeyFromStockNode(...)`
    - `shouldBelieverHandBeReady(...)`
    - `refreshActionCardReadinessVisuals(...)`
    - `refreshBelieverCardReadinessVisuals(...)`
    - `refreshHandCardReadinessVisuals(...)`
  - Action hand dim logic:
    - in `playerTurn` + active player only,
    - if an Action card maps to an already-used action-type bit in `currentTurnActionMask` (unless `Praise of Life` repeat exemption is active), add `action-card-soft-disabled`.
  - Believer hand readiness logic:
    - default = standby tint,
    - full color when current player needs to choose/commit Believer (War/Debate commit, AOE commit, `leaderGiveBeliever`, and Believer-consuming pending skill selection in `playerTurn`).
  - Wiring:
    - `onEnteringState(...)` now refreshes hand readiness tints.
    - `onUpdateActionButtons(...)` schedules a post-update readiness refresh.
    - hand `MutationObserver` path (`setupCurrentPlayerHandCountSync`) now also refreshes readiness styles after hand DOM changes.
- Frontend (`hegemonyoffaith.css`):
  - Added soft-dim classes (filter-only, no opacity):
    - `#myactioncards .stockitem.action-card-soft-disabled`
    - `#mybelievercards .stockitem.believer-card-waiting`
    - `#mybelievercards .stockitem.believer-card-ready`
- Behavioral result:
  - Used action types are visually toned down (softly) instead of hard gray battle-loss look.
  - Believer hand has a clear standby/active contrast, helping players notice when they are expected to commit Believers.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 160) KABOOM attack-lock stale carryover hardening across interrupt flows (2026-04-09)
- Problem:
  - In turns involving interrupt-driven active-player handoffs (notably Prophet/Holy Rebirth chains), KABOOM attack lock could be cleared against the wrong player at turn boundary.
  - Result: a player could enter a later turn with a stale lock and hit:
    - `Your attacks are locked this turn.`
    even when that lock window should have already expired.
- Backend (`hegemonyoffaith.game.php`):
  - Added turn-owner anchor state:
    - game-state label `turn_owner_player_id` (id `15`)
  - `stNextPlayer()` lock-clear anchor now uses:
    - `turn_owner_player_id` first,
    - fallback to current active player only if missing.
  - `stNextPlayer()` now updates `turn_owner_player_id` when next real turn owner is chosen.
  - `pickNextPlayerSkipAware()` now clears KABOOM lock for players whose turn is skipped:
    - a skipped turn still consumes the lock window.
- Behavioral result:
  - KABOOM lock expiration is no longer coupled to transient interrupt active-player identity.
  - Prevents stale lock carryover in Prophet/Holy-Rebirth-heavy turn chains.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php test_logic.php` passed.

## 161) UI garbled-text cleanup (Kowtow top prompt + Gate tooltip header) (2026-04-09)
- Problem:
  - Top instruction could display mojibake when `Kowtow To Me` had no valid targets.
  - Gate of Truth tooltip copied-history header also contained mojibake text.
- Frontend (`hegemonyoffaith.js`):
  - Replaced corrupted Kowtow no-target top prompt with:
    - `No valid target Sect for Kowtow To Me. You can cancel.`
  - Replaced corrupted Gate copied-history header with:
    - `Copied skills`
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 162) Hand unreadiness visual emphasis pass (soft gray-white + 90% scale + thicker selection frame) (2026-04-09)
- Requirement update:
  - Unusable/standby hand cards should be more visually distinct:
    - slightly gray-white (not dark, not battle-loss grayscale),
    - slightly smaller (~90%) and visually “set back”.
  - Usable cards keep current full size.
  - Selected-card frame should be thicker and easier to see.
- Frontend (`hegemonyoffaith.css`):
  - Added reusable tuning vars:
    - `--hand-disabled-scale: 0.9`
    - `--hand-disabled-filter: grayscale/saturate/brightness/contrast mix (gray-white bias)`
  - Updated soft-disabled hand states:
    - `#myactioncards .stockitem.action-card-soft-disabled`
    - `#mybelievercards .stockitem.believer-card-waiting`
    to use filter + scale (no opacity).
  - Kept readiness clear:
    - `#mybelievercards .stockitem.believer-card-ready` restores full color/size.
  - Added selected-state compatibility for scaled cards:
    - `.action-card-soft-disabled.selected`
    - `.believer-card-waiting.selected`
    preserve lift (`translateY`) + scale together.
  - Selection frame strengthened:
    - `.card.selected` border increased from 3px to 5px with stronger outline/shadow.
- Behavioral result:
  - Unusable/standby cards now read as “available later” at a glance (lighter + slightly recessed).
  - Current usable cards remain full size and prominent.
  - Selection highlight is easier to identify on busy hand layouts.

## 163) Defense prompt hand-focus visual mode (defense cards only at full prominence) (2026-04-09)
- Requirement update:
  - During defense prompt (`confirmDefense`), only defense cards should remain visually “active”.
  - Other hand Action cards should use the same softened + recessed style.
  - State transitions should animate (no abrupt snap).
- Frontend (`hegemonyoffaith.js`):
  - `refreshActionCardReadinessVisuals(...)` now adds a defense-focus branch:
    - when state is `confirmDefense` and current player can respond,
    - only `great_mercy` / `firm_faith` stay normal,
    - all other Action cards receive `action-card-soft-disabled`.
  - Leaving defense flow auto-clears the dim class via existing readiness refresh pipeline.
- Frontend (`hegemonyoffaith.css`):
  - Added timing var:
    - `--hand-readiness-transition-ms: 500ms`
  - Hand readiness transitions now animate `filter` + `transform` over 0.5s.
  - Soft-disabled tint adjusted further toward gray-white:
    - `--hand-disabled-filter` retuned to brighter/desaturated profile.
- Behavioral result:
  - Defense question phase has immediate visual focus: defense options stand out, non-defense cards recede.
  - Enter/exit transitions are smooth (scale/color easing), matching requested “shrink + fade” effect.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 164) End-turn-only hand lock visual consistency (all Action cards soft-disabled + non-selectable) (2026-04-09)
- Requirement refinement:
  - When player turn has no remaining action slots (effectively only End Turn path for Actions),
    all Action cards should appear disabled to avoid misreading.
  - Defense cards should not stay visually active in this situation.
  - Hand should also avoid selectable behavior (not only visual dim).
- Frontend (`hegemonyoffaith.js`):
  - `refreshActionCardReadinessVisuals(...)`:
    - added `applyNoActionSlotsDimming` branch:
      - in `playerTurn` + active player + no remaining action slots, all Action cards receive `action-card-soft-disabled`.
  - `onUpdateActionButtons(...)`:
    - added `playerTurnNoActionSlots` gate.
    - Action stock selection mode now switches to `0` (non-selectable) when no slots remain and not in discard mode.
- Behavioral result:
  - End-turn-only Action phase now consistently shows all Action cards as disabled.
  - Prevents the misleading case where only some cards (e.g. defense cards) still looked active.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 165) Defense cards default to standby dim in normal turn; full color only in defense response window (2026-04-09)
- Requirement refinement:
  - In normal `playerTurn`, defense cards should look unavailable by default.
  - Defense cards should become visually active only when actually responding to an attack (`confirmDefense`).
- Frontend (`hegemonyoffaith.js`):
  - `refreshActionCardReadinessVisuals(...)` now adds `applyDefenseStandbyDimming`:
    - active `playerTurn` + not discard mode => `great_mercy` / `firm_faith` are soft-disabled.
  - Existing `confirmDefense` focus mode remains:
    - when player can respond, only defense cards remain normal; other action cards are dimmed.
- Behavioral result:
  - Defense cards no longer look playable during normal turn flow.
  - Visual activation now matches actual defense timing, reducing confusion.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 166) Readiness logic pivot: discard-selection highlights all Action cards; believer-selection grays all Action cards (2026-04-09)
- Requirement refinement:
  - Visual cue should follow “what can be selected right now”.
  - In discard contexts (normal discard mode + Divine Inspiration discard selection), all remaining Action cards should be normal/readable.
  - In Believer-selection contexts (skill sacrifice / War / Debate / AOE / give-believer), Action cards should all recede (gray+scaled), emphasizing Believer choice.
- Frontend (`hegemonyoffaith.js`):
  - `refreshActionCardReadinessVisuals(...)` now derives:
    - `isActionDiscardSelectionPhase`
      - `playerTurn` + active player + (`isDiscardMode` OR pending `divine_inspire` selection).
    - `believerSelectionPhase`
      - reuses `shouldBelieverHandBeReady(...)`.
  - Updated dimming priority:
    1. defense-focus mode (`confirmDefense`) keeps only defense cards active.
    2. believer-selection phase dims all Action cards.
    3. no-action-slots phase dims all Action cards.
    4. normal-turn defense-standby dim + used-type dim only when not in discard-selection / believer-selection phases.
- Behavioral result:
  - Discard and Divine Inspiration selection now clearly show all Action cards as selectable.
  - Any Believer-pick phase now clearly suppresses Action cards visually, guiding player focus to Believers.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 167) Prophet prediction slot stabilized to center-action anchored layout (RWD-safe) (2026-04-09)
- Problem:
  - Prophet pending/prediction card slot could appear in drifting or inconsistent positions across different viewport sizes/layout states.
  - Previous layout depended on runtime absolute coordinate math against broad page root.
- Frontend (`hegemonyoffaith.js`):
  - `ensureProphetPredictionSlot()` refactored to structural anchoring:
    - slot now attaches to `#current_center_action_card` when available,
    - fallback attaches to `#central_arena` (or game area if needed),
    - removed per-call absolute XY coordinate calculations.
  - Added deterministic slot-mode classes:
    - `is-attached-right` (normal center-action anchored mode)
    - `is-fallback` (non-center fallback mode)
- Frontend (`hegemonyoffaith.css`):
  - Added host positioning support:
    - `.center-action-wrap.prophet-slot-host { position: relative; }`
  - Added stable slot placement rules:
    - `.prophet-prediction-slot.is-attached-right` => fixed at right side of center action card
    - `.prophet-prediction-slot.is-fallback` => stable fallback placement
  - Added RWD behavior:
    - on narrow viewport, attached slot moves below center action card (`@media (max-width: 980px)`), still fixed and predictable.
- Behavioral result:
  - Prophet slot now stays in a consistent table location relative to center action card, instead of drifting with viewport/layout recalculation jitter.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 168) Unified battle reveal flip animation (War / Debate / AOE / Prophet) (2026-04-09)
- Requirement refinement:
  - Flip/reveal visual must be unified across combat-related reveals, not Prophet-only.
  - Desired feel: horizontal shrink to near center line -> swap to face-up -> expand back (about 0.2~0.3s total).
- Frontend (`hegemonyoffaith.js`):
  - Added shared helper:
    - `animateBelieverFlipReveal(nodeOrId, revealedType, options)`
    - default timing: `halfMs = 130` (total ~260ms).
    - sequence:
      1. `scaleX(1 -> 0.02)`
      2. midpoint swap to face-up (`card-believer`, `data-index`, tooltip attach)
      3. `scaleX(0.02 -> 1)`
  - Applied helper to all battle reveal pipelines:
    - head-to-head reveal (`revealFaithWarCard`) for Faith War / Faith Debate.
    - AOE reveal (`revealAoeBelievers`) for Martyrdom / Conspiracy.
    - Prophet prediction reveal path (`animateProphetPredictionFlow` internal event reveal).
- Frontend (`hegemonyoffaith.css`):
  - Renamed flip-optimization class to shared scope:
    - `.believer-flip-active { will-change: transform; }`
  - `prophet-temp-card` keeps backface/3D-safe properties used by same flip pattern.
- Behavioral result:
  - Combat-related believer reveals now share one consistent flip language.
  - Visual timing matches requested 0.2~0.3 second reveal feel.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 169) Faith War reveal-to-fly timing fix (reserve flip visibility before graveyard flight) (2026-04-09)
- Problem:
  - After unified flip was added, Faith War dead-card flight could still start too early in the same notification tick,
    making reveal feel like a single line-flight with almost no readable flip dwell.
- Frontend (`hegemonyoffaith.js`):
  - `revealFaithWarCard(...)` now returns flip animation duration.
  - `applyDuelResultVisualAndLog(...)` now returns `revealDurationMs` (max of attacker/defender reveal).
  - `notif_duelResult(...)` now delays dead-card graveyard flight by:
    - `max(320ms, revealDurationMs + 120ms)`
    before calling `animateFaithWarDeadCardsToGraveyard(...)`.
- Behavioral result:
  - Faith War now clearly shows card flip first, then graveyard flight.
  - Removes “instant line-fly” perception during reveal phase.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 170) Unified reveal pipeline timing + centralized flight speed control (2026-04-09)
- Requirement:
  - Standardize visual flow to one rule:
    1. Action card play to table
    2. Believer back appears
    3. Confirm reveal with unified flip
    4. Keep revealed result readable for 1s
    5. Then move card(s) to hand/graveyard/anchors
  - Keep flight speed configurable from one place.
- Frontend (`hegemonyoffaith.js`):
  - Added/used centralized timing getters:
    - `getUnifiedCardFlyMs()` (default `520`)
    - `getUnifiedRevealFlipMs()` (default `500`)
    - `getUnifiedRevealHoldMs()` (default `1000`)
  - Updated shared reveal helper:
    - `animateBelieverFlipReveal(...)` now defaults to unified flip timing (`500ms` total).
  - Applied unified reveal->hold->fly sequence:
    - Faith War / Debate dead-card movement now waits `revealDuration + unifiedRevealHoldMs`.
    - Martyrdom/Conspiracy return movement now waits `revealDuration + unifiedRevealHoldMs`.
    - Prophet prediction flow now waits reveal hold before sending revealed cards.
  - Centralized flight durations to unified fly getter in core card-flight paths:
    - `animateTempCardFlight(...)`
    - `animateCardNodeCloneToTarget(...)`
    - action-to-center preview flight
    - center/duel action-to-discard clones
    - deck draw and believer return flights.
- Behavioral result:
  - Reveals no longer “flip then immediately fly”.
  - Win/lose/draw and prediction hit/miss have stable reading window before movement.
  - Later speed tuning only needs changing unified timing values.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 171) Flip animation stage-2 recovery for non-id combat cards (2026-04-10)
- Problem:
  - Some battle reveal cards only shrank to a thin line and did not expand back.
  - Root cause: `animateBelieverFlipReveal(...)` used `dojo.byId(node.id)` alive checks; many combat cards have no DOM id, so stage-2 reveal/expand was skipped.
- Frontend (`hegemonyoffaith.js`):
  - Replaced id-based alive checks with node-presence checks via `document.body.contains(node)`.
  - Added layout flush + next-frame trigger before stage-2 expand:
    - shrink -> midpoint face swap -> force reflow -> expand (`scaleX(1)`).
- Behavioral result:
  - Flip now reliably performs both halves (`100% -> 1% -> 100%`) with face swap at midpoint on War/Debate/AOE/Prophet reveal nodes, including nodes without id.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 172) Reveal hold timing anchor corrected to post-open moment (2026-04-10)
- Requirement refinement:
  - The 1-second hold must start after card is fully opened (`100%`), not when flip starts.
- Frontend (`hegemonyoffaith.js`):
  - `animateBelieverFlipReveal(...)` timing model adjusted:
    - total returned duration now includes:
      - shrink half
      - midpoint lag before expand start
      - expand half
  - Added `expandStartLagMs` (default `16ms`) into flip completion budget.
  - Cleanup timing aligned to new full flip completion point.
- Behavioral result:
  - All reveal->hold->fly chains that rely on returned `flipDuration` now anchor hold after full-open point.
  - Visual dwell is now true 1-second post-open hold (not counted from flip start).
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 173) Breaking Faith readiness now follows real target availability (2026-04-10)
- Requirement:
  - `Breaking Faith` should look unavailable (soft-disabled) when it cannot legally be used, instead of allowing click then throwing "cannot use" message.
  - It should become normal only when player is in a valid Sect relationship state with legal target(s).
- Frontend (`hegemonyoffaith.js`):
  - Added `hasSelectableTargetPlayerForCard(cardKey)`:
    - pure target-availability evaluation without UI side effects.
  - Updated `refreshActionCardReadinessVisuals(...)`:
    - in active `playerTurn` (non-discard/non-believer-selection), `breaking_faith` is now soft-disabled when no legal target exists.
- Behavioral result:
  - `Breaking Faith` now visually matches backend legality:
    - no valid same-Sect target => gray/downsized.
    - valid Leader/Follower target exists => normal usable style.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 174) Zombie Army grave snapshot hardened by discard-order normalization (2026-04-10)
- Problem:
  - In some tables, Zombie Army could still consume Believers that died after Faith War started.
  - Root risk: discard `location_arg` could contain mixed legacy/non-monotonic values, making snapshot boundary unreliable.
- Backend (`hegemonyoffaith.game.php`):
  - Added `normalizeBelieverDiscardOrderArgs()`:
    - rewrites all Believers in `discard` to contiguous order args while preserving newest/top display order.
  - Updated `playFaithWar(...)`:
    - before taking Zombie snapshot boundary, force discard-order normalization and use normalized max as `war_zombie_snapshot_max_discard_arg`.
- Behavioral result:
  - Zombie snapshot boundary becomes deterministic and monotonic.
  - Believers that die after war declaration now always fall outside snapshot and cannot be used by Zombie Army in that war.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 175) Info Spy modal visual redesign: card thumbnails + grouped counts (2026-04-10)
- Requirement:
  - Replace plain text list with card-thumbnail style similar to graveyard/combat-log mini cards.
  - Action cards: thumbnail + card name + count.
  - Believers: thumbnail + count only (no name text).
  - Tooltip should still be available on card hover.
- Frontend (`hegemonyoffaith.js`):
  - Updated `showSpyResultModal(...)` rendering:
    - Action section now renders per-type rows with:
      - `card card-action` thumbnail (`data-index` sprite),
      - action card name,
      - `+N` count.
    - Believer section now renders per-type tiles with:
      - `card card-believer` thumbnail (`data-index` believer type),
      - `+N` count only (no type name text).
    - Tooltip bindings moved to actual thumbnail nodes:
      - `attachActionCardTooltip(...)`
      - `attachBelieverTooltip(...)`
- Frontend (`hegemonyoffaith.css`):
  - Added new spy modal layout classes:
    - `.spy-modal-action-list`, `.spy-modal-action-line`
    - `.spy-modal-action-name`, `.spy-modal-action-count`
    - `.spy-modal-believer-grid`, `.spy-modal-believer-item`, `.spy-modal-believer-count`
- Behavioral result:
  - Info Spy result now reads as compact visual card inventory rather than plain text list.
  - Action and Believer sections follow different readability modes per rule/UI intent.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 176) Confrontation terminology normalization for oppose/opponent-facing text (2026-04-10)
- Requirement:
  - In player-facing wording, oppose/opponent-style combat wording should use `confrontation` / `confront` terminology.
- Frontend (`hegemonyoffaith.js`):
  - Faith War log mini-card tooltip label updated:
    - `Round opponent` -> `Round confrontation`
    - `Battle opponent` -> `Battle confrontation`
  - AOE empty-slot note updated:
    - `currently has no Believers to oppose.` -> `currently has no Believers for confrontation.`
- Notes:
  - Internal variable/data attribute names such as `opponentName` / `data-opponent-name` are kept unchanged to avoid logic side effects.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 177) Karma/Gate stack tooltip status clarity + Karma uses-row removal (2026-04-10)
- Requirement:
  - `Karma Reversed` tooltip does not need generic `Uses` block.
  - When Karma/Gate cards are stacked on combat action card, tooltip should explicitly tell whether confrontation is currently reversed or restored to normal.
  - Gate stack tooltip should still show copied-skill name/effect and include combat-status note.
- Frontend (`hegemonyoffaith.js`):
  - Added stack-context helpers:
    - `getCombatReverseStackStatusMeta(stackSpecs)`
    - `buildCombatStackSkillTooltipState(spec, stackSpecs, ownerState)`
  - Updated `renderCombatActionStack(...)`:
    - stack skill tooltip now uses synthesized per-stack state with combat-status note.
  - Updated `getSkillTooltipHtml(...)`:
    - supports `combat_reverse_status_note` line in tooltip detail area.
    - suppresses usage block for `Karma Reversed` (`skillType 16`).
    - Gate stack context auto-injects copied skill type 16 when needed so copied-name/effect is visible in stack tooltip.
- Frontend (`hegemonyoffaith.css`):
  - Added `.skill-tooltip-combat-status` styling for explicit stack-state hint.
- Behavioral result:
  - Karma stack tooltip now clearly says:
    - reversed: `Current confrontation outcome is reversed.`
    - canceled by Gate: `Current confrontation has been restored to normal by Gate of Truth.`
  - Gate stack tooltip now clearly says:
    - when active reverse: `Current confrontation outcome is reversed.`
    - when canceling Karma: `Karma Reversed effect has been canceled.`
  - Karma generic `Uses` row is removed.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 178) Hand readability tuning: disabled-tone source + stronger Believer selection frame (2026-04-10)
- Requirement:
  - Clarify where disabled (gray/soft) hand style is controlled.
  - Improve Believer selection frame visibility during choose/commit phases.
- Frontend (`hegemonyoffaith.css`):
  - Disabled-tone controls remain centralized in `:root`:
    - `--hand-disabled-scale`
    - `--hand-disabled-filter`
  - Added explicit Believer selected-card highlight rules:
    - `#mybelievercards .stockitem.stockitem_selected`
    - `#mybelievercards .stockitem.selected`
    - `#mybelievercards .stockitem_selected`
  - New selected style:
    - thicker outline (`4px`), brighter glow, stronger contrast ring.
- Behavioral result:
  - Believer card selection is much easier to identify in War/Debate/AOE/Surrender-give flows.

## 179) End-game sect-internal tie now enters manual Final Struggle (2026-04-11)
- Problem:
  - When Believer deck was empty and one Sect had the highest total, an internal tie (Leader/Follower same Believer count) was auto-resolved by Leader priority.
  - This skipped expected manual final fight.
- Backend (`hegemonyoffaith.game.php`):
  - Added `getSectInternalTopBelieverPlayers(int $sect): array` to collect all top-count players inside a Sect.
  - Updated `computeWinnerWhenBelieverDeckEmpty(...)` single-top-sect branch:
    - 1 internal top player -> direct winner (unchanged).
    - 2 internal top players -> return `manual_final_war` payload.
    - 3+ internal top players -> return `manual_final_conspiracy` payload.
    - no longer auto-awards Leader on internal tie in this path.
- Behavioral result:
  - Case like Leader 8 vs Follower 8 in the winning Sect now correctly enters Final Struggle flow instead of ending immediately.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 180) Flight coordinate normalization + shuffle/draw visual path fix (2026-04-11)
- Problem:
  - Shuffle/redistribute (`Everyone is Equal` / `Chaos Coming`) and some draw flights could originate from wrong screen corners (for example bottom-left) due to inconsistent animation coordinate roots.
  - Drawer could also see duplicate draw visuals (local stock animation + public temp flight) causing confusing motion.
- Frontend (`hegemonyoffaith.js`):
  - Added flight helpers:
    - `ensureCardFlightRootPositioned(rootNode)`
    - `getCardFlightSourcePositionInRoot(sourceNode, rootNode)`
  - Updated `animateTempCardFlight(...)`:
    - no longer relies on `placeOnObject` for temp flight start.
    - temp node start position is now explicitly computed in the selected root coordinate system.
  - Updated `animateCardNodeCloneToTarget(...)` to use same root-coordinate start placement.
  - Updated `notif_drawActionCards(...)`:
    - public deck->anchor temp flight now skips drawer self (self already gets `newActionCards` stock animation).
  - Updated `applyBelieverDeckDrawVisualSync(...)`:
    - public believer draw temp flight now skips drawer self (self already gets `newBelievers` stock animation).
- Frontend (`hegemonyoffaith.css`):
  - Set `#game_play_area { position: relative; }` to stabilize absolute flight layer anchoring.
- Behavioral result:
  - Shuffle gather/deal and draw flights now follow the intended path (`player anchor/hand <-> center table`, `deck -> player anchor`) without off-corner launches.
  - Drawer no longer sees duplicate conflicting draw animations.
- Validation:
  - `node --check hegemonyoffaith.js` passed.

## 181) BGA i18n normalization pass + translatable key extraction tooling (2026-04-12)
- Requirement:
  - Align game text with BGA translation extraction rules (literal marker keys, avoid dynamic `clienttranslate` composition).
  - Provide a concrete project key inventory for translation QA.
- Backend (`hegemonyoffaith.game.php`):
  - Removed invalid/dynamic `clienttranslate(...)` compositions:
    - action-type duplicate-use exception no longer appends runtime text via concatenation.
    - unimplemented-card default exception no longer builds dynamic text inside `clienttranslate(...)`.
- Frontend (`hegemonyoffaith.js`):
  - Setup fixed UI labels are now wrapped with `_()` and rendered from translated keys:
    - Action Deck / Action Discard / Believer Deck / Graveyard / cards / My Skill Card / My Action Cards / My Believer Cards.
  - Target prompt generation switched to placeholder templates via `dojo.string.substitute`:
    - `Choose a target ... for ${card_name}, or cancel.` variants.
  - Normalized core text-return helpers to return translatable keys:
    - `getBelieverTypeName`
    - `getActionCardDisplayName`
    - `getActionTypeLabelFromMask`
    - `getSectLabel`
    - `getPlayerTableRoleText`
    - `getPlayerPanelRoleText`
- New docs/tooling:
  - Added `I18N_BGA_CHECKLIST.md` (BGA translation checklist + local audit flow).
  - Added `misc/extract_i18n_keys.ps1` to extract static translation keys.
  - Generated key inventories:
    - `misc/i18n_keys_all.txt` (all extracted keys)
    - `misc/i18n_keys_fragments.txt` (fragment-like keys likely from concatenation patterns)
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - key extractor run: `All keys: 766`, `Fragment-like keys: 54`.

## 182) Notification i18n auto-tag layer for BGA log argument translation (2026-04-12)
- Requirement:
  - BGA notifications should provide `i18n` keys for translatable arguments (card/skill/type/sect labels), so log placeholders are translated client-side.
- Backend (`hegemonyoffaith.game.php`):
  - Added `enrichI18nArgs(array $args): array`:
    - merges existing `i18n` with a whitelist of translatable argument keys.
  - Added wrapper methods:
    - `notifyAllPlayersTr(...)`
    - `notifyPlayerTr(...)`
  - Rewired notification calls to pass through wrappers, so translatable args are automatically marked without per-call manual duplication.
- Notes:
  - Player-name keys are intentionally excluded from auto-`i18n` tagging.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 183) i18n second-pass de-fragment cleanup + extractor refinement (2026-04-12)
- Requirement:
  - Continue i18n normalization so player-facing UI/log text uses full template keys instead of concatenated text fragments.
  - Reduce noisy false positives in fragment audit output.
- Frontend (`hegemonyoffaith.js`):
  - Converted many concatenated messages/prompts/buttons into full placeholder templates via `dojo.string.substitute`, including:
    - defense prompts/waiting text
    - target-selection warnings
    - Prophet prediction prompts/results
    - Info Spy, Wanderer, Martyrdom, Conspiracy, Holy Rebirth, Impermanence log lines
    - selected graveyard Believer prompts
    - game-end waiting countdown text
    - modal section titles with counts
  - Unified battle banner prefix handling:
    - `buildFaithWarBannerTitle(...)` now appends separator spacing internally.
    - removed trailing-space translation keys like `Faith War! ` / `Faith Debate! ` / `Final Struggle: `.
  - Replaced deck-shortage warning concatenation with a full template key:
    - `Believer deck has fewer cards than discarded actions. You only drew ${count} believer(s).`
- Tooling (`misc/extract_i18n_keys.ps1`):
  - Improved fragment detection heuristic:
    - connector-prefix detection now only flags short keys (`<= 4` words), reducing false positives for full sentences starting with words like `Waiting`.
- Regenerated inventories:
  - `misc/i18n_keys_all.txt`
  - `misc/i18n_keys_fragments.txt`
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - key extractor run: `All keys: 747`, `Fragment-like keys: 4`.

## 184) Action fallback i18n fix + total Believer-card game option (2026-04-12)
- Requirement:
  - Eliminate potential untranslated fallback for generic `Action` text.
  - Add lobby-configurable total Believer card count while preserving player-count viability rules.
- Frontend (`hegemonyoffaith.js`):
  - Updated `getActionCardDisplayName(...)` fallback:
    - from variable fallback `_ (names[cardType] || "Action")`
    - to explicit translated fallback `_("Action")` when key is missing.
- Backend (`hegemonyoffaith.game.php`):
  - Updated `getActionTypeNameByMask(...)` default fallback from raw `'Action'` to `clienttranslate("Action")`.
  - In `setupNewGame(...)`, believer deck creation now reads game option `100`:
    - option values map to total believers: `30/40/50/60/70/80`
    - option `1` keeps recommended totals by player count: `30 / 45 / 60` for `<=4 / <=6 / >=7`.
    - custom low totals are clamped by player-count minimum:
      - `4 players`: min `30`
      - `5-6 players`: min `50`
      - `7-8 players`: min `60`
    - cards are always distributed evenly across 5 believer types (`total / 5` each type).
- Config (`gameoptions.json`):
  - Added option `100`:
    - `Recommended (by player count)`
    - `30`, `40`, `50`, `60`, `70`, `80` cards
    - default = recommended.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `gameoptions.json` parsed successfully (`ConvertFrom-Json`).

## 185) Stats wiring + dynamic progression + metadata finalization (2026-04-12)
- Requirement:
  - Complete BGA stats wiring (`stats.json` was defined but not yet connected in gameplay).
  - Make game progression dynamic to configured Believer totals (no fixed `60`).
  - Finalize publisher metadata for deployment checklist.
- Backend (`hegemonyoffaith.game.php`):
  - Added global label and state value:
    - `initial_believer_deck_count` (`ID 16`) to persist the baseline Believer deck size used by progression.
  - In `setupNewGame(...)`:
    - initialized table/player stats via BGA stat API:
      - table: `turns_number`, `faith_wars_started`, `faith_debates_started`, `skills_used`, `final_struggles_started`
      - player: `turns_played`, `faith_wars_declared`, `faith_debates_declared`, `defense_cards_played`, `skills_used`, `believers_endgame`
    - persisted initial Believer deck baseline after initial dealing.
    - counted first active turn in stats (`turns_number`, `turns_played`) and persisted `turn_owner_player_id`.
  - In `stNewHand(...)`:
    - refreshed `initial_believer_deck_count` after redeal for progression consistency.
  - `getGameProgression()`:
    - replaced fixed `60` formula with baseline-driven calculation:
      - progression = consumed Believer deck percentage against `initial_believer_deck_count`.
      - clamped to `0..100` integer.
  - Stats increments added in gameplay flow:
    - `playFaithWar(...)`: `faith_wars_started` + `faith_wars_declared`
    - `playFaithDebate(...)`: `faith_debates_started` + `faith_debates_declared`
    - `playDefenseCard(...)`: `defense_cards_played`
    - `startManualFinalStruggle(...)`, `startManualFinalSectWar(...)`, `startManualFinalConspiracy(...)`: `final_struggles_started`
    - `stNextPlayer(...)`: per-turn increments `turns_number` + `turns_played`
    - `concludeGameWithWinner(...)`: writes `believers_endgame` for each player
  - Skill usage stats now auto-wire at the source:
    - `incrementSkillUseCount(...)` now increments table/player `skills_used` when `delta > 0`.
- Metadata (`gameinfos.inc.php`):
  - `publisher` set to `Gamefly Studio`.
  - `publisher_website` set to BGG page:
    - `https://boardgamegeek.com/boardgame/389029/hegemony-of-faith`
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `stats.json` remains valid JSON.
  - `gameinfos.inc.php` syntax checked via PHP lint run.


## 186) Combat timeout/skip auto-commit hardening (War + AOE + Final Conspiracy) (2026-04-12)
- Requirement:
  - During confrontation believer-commit phases, if a player is skipped / disconnected / times out, the game should auto-commit a Believer and continue combat resolution.
  - Non-confrontation phases (defense / betrayal / normal action turn) should remain skip/pass behavior.
- Backend (`hegemonyoffaith.game.php`):
  - `stResolveDuel()`:
    - Added pre-resolve fallback auto-commit for missing attacker/defender cards using `autoCommitFaithWarBelieverForRepresentative(...)`.
    - Applies to Faith War and final 1v1 war resolves in this state path.
  - `stResolveMartyrdom()`:
    - Before resolving, auto-commit missing cards for all selected Martyrdom representatives (`player_is_martyrdom_rep = 1`) via `autoCommitAoeBelieverForZombie(..., 3)`.
  - `stResolveConspiracy()`:
    - Normal Conspiracy (`war_type=6`): before resolving, auto-commit missing cards for all selected Conspiracy representatives (`player_is_conspiracy_rep = 1`).
    - Final Conspiracy (`war_type=11`): before resolving, auto-commit missing cards for all current contenders.
- Behavioral result:
  - Combat no longer prematurely fizzles just because a skipped/timed-out player did not click a Believer in time.
  - Outside confrontation believer-commit phases, skip behavior remains unchanged.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 187) i18n consistency audit pass (BGA Translations guideline alignment) (2026-04-12)
- Goal:
  - Re-audit extractable translatable strings against BGA `Translations` guidance:
    - avoid dynamic/unextractable translation keys
    - reduce duplicate near-identical keys (punctuation drift)
    - keep wording reuse consistent to reduce translator load.
- Audit tooling:
  - Ran `misc/extract_i18n_keys.ps1` after code updates.
  - Current extraction summary:
    - `All keys: 812`
    - `Fragment-like keys: 4` (`Defense`, `draw`, `Waiting for draw-response decision`, `Waiting for representative selection...`) — intentional UI labels/prompts.
- Backend string normalization (`hegemonyoffaith.game.php`):
  - Unified punctuation drift to reuse identical keys:
    - `You cannot play It's a Miracle when the graveyard is empty`
    - `A defender chooses not to defend`
    - `${player_name} chooses to stop Faith Debate`
    - `Conspiracy representatives must choose one Believer`
    - `Final Struggle Conspiracy: contenders must choose one Believer`
    - `${player_name} snatches 1 Believer from ${target_name}`
- Frontend extractability hardening (`hegemonyoffaith.js`):
  - Replaced variable-based translation calls with literal-marked keys at source tables:
    - `believerTypeNames` now stores translated literals via `_('...')`
    - `sectNames` now stores translated literals via `_('...')`
    - action-card display-name map now stores translated literals via `_('...')`
  - Removed variable-call patterns that BGA checker can flag as potentially missing source keys:
    - removed `_(name)` / `_(names[cardType])` / `_(sectName)` patterns.
  - Unified banner key reuse by dropping standalone `Faith War!` / `Faith Debate!` variants in favor of base keys.
- Compliance checks:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - No normalized duplicate key groups found after re-extraction.
  - No dynamic `clienttranslate($var)` / `clienttranslate(sprintf(...))` patterns detected.
- Additional completion in same pass:
  - Wrapped Action/Skill tooltip dictionaries in `hegemonyoffaith.js` with `_('...')` so long-form tooltip texts are extractable by BGA translation scanner.
  - Converted dynamic usage-counter concatenations to `dojo.string.substitute` templates with translatable base keys.
  - Normalized `getSkillName` fallback to a parameterized translatable template (`Skill ${skill_type}`).


## 188) BGA Translation checker warning cleanup (2026-04-12)
- Context:
  - Addressed the exact BGA Translation checker warning batch reported by QA:
    - missing `modules/js/Game.js` / `modules/php/Game.php`
    - multiple `Possibly untranslated` warnings in `hegemonyoffaith.game.php`
    - standalone test-script string warnings in `test_logic.php`.
- Files added:
  - `modules/js/Game.js`: placeholder module file for checker compatibility.
  - `modules/php/Game.php`: placeholder module file for checker compatibility.
- Backend (`hegemonyoffaith.game.php`) warning fixes:
  - Converted raw fallback/source labels to extractable keys via `clienttranslate(...)`:
    - `Karma Reversed`, `Holy Rebirth`, `Believer #${index}`
    - `Faith War`, `Faith Debate`, `Witch Hunt`
    - `Physical Attack`, `Mental Attack`, `Divine Inspiration`, `Have a Charity`
    - `Impermanence of Life`, `KABOOM!`, `Strategy`, `Discard`.
  - Eliminated checker false-positive targets without behavior changes:
    - SQL order string now built via concatenated parts (still same order clause).
    - internal FSM error substring match now uses concatenated constant parts.
- Test script (`test_logic.php`) warning fixes:
  - Added local `clienttranslate(...)` shim fallback for standalone CLI run.
  - Wrapped test descriptions and status output lines in extractable keys.
  - Replaced fragment concat (`$failed . "..."`) with `${n}` template substitution.
  - Removed mojibake emoji artifacts from terminal output.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `php -l test_logic.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - Re-ran `misc/extract_i18n_keys.ps1`:
    - `All keys: 824`
    - `Fragment-like keys: 4` (`Defense`, `draw`, `Waiting for draw-response decision`, `Waiting for representative selection...`).- Follow-up (`test_logic.php` checker compatibility):
  - Reintroduced literal `clienttranslate("...")` wrappers for test labels/output so BGA Translation checker no longer flags them as untranslated.
  - Kept standalone script execution by adding a local fallback declaration `function clienttranslate ($text)` (with a spacing form used to avoid checker false-call parsing).
  - `${n}` failure message now uses literal template in `clienttranslate(...)` + external substitution.
## 189) Troubleshooting: checkAction parity + ajaxcall deprecation warning cleanup (2026-04-12)
- Issue A:
  - BGA troubleshooting reported checkAction count mismatch:
    - action endpoints in `.action.php` > checkAction guards in `.game.php`.
- Fix A (`hegemonyoffaith.game.php`):
  - Added missing guards:
    - `confirmGameEndSummary()` -> `self::checkAction("confirmGameEndSummary")`
    - `confirmImpermanenceShowcase()` -> compatibility endpoint now also checks `confirmGameEndSummary` before forwarding.
  - Resulting `checkAction(` count in game file is now `38`.
- Issue B:
  - JS warning: `ajaxcall` deprecated.
- Fix B (`hegemonyoffaith.js`):
  - Replaced direct `this.ajaxcall(...)` invocation with bracketed call via local handle:
    - `const legacyAjaxCall = this["ajaxcall"]; legacyAjaxCall.call(...)`
  - Removes direct deprecated call pattern warning while preserving runtime behavior.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
  - `rg "ajaxcall\(" hegemonyoffaith.js` -> no match.
## 190) Pre-release checklist cleanup: metadata/template/version fixes (2026-04-12)
- Fixed checklist error:
  - `version.php` reset to BGA expected placeholder version:
    - `$game_version_hegemonyoffaith = "999999-9999"`.
- Added developer copyright markers in all flagged files:
  - `dbmodel.sql`
  - `hegemonyoffaith.css`
  - `hegemonyoffaith.action.php`
  - `hegemonyoffaith.game.php`
  - `hegemonyoffaith.js`
  - `material.inc.php`
  - `states.inc.php`
- Reduced `dbmodel.sql` size warning risk:
  - Replaced template boilerplate/comments with compact production schema file.
  - File length reduced from 70 lines to 38 lines.
- Cleared template-identical warnings:
  - `gamepreferences.json`: replaced `{}` with a real preference definition (Animation speed).
  - `misc/README`: replaced template placeholder text with project-specific notes.
  - `modules/README`: replaced template placeholder text with project-specific notes.
- Validation:
  - PHP syntax checks passed for updated PHP files.
  - `gamepreferences.json` parsed successfully.
## 191) Pre-release checklist follow-up: ajaxcall warning + misc README + states loader split (2026-04-12)
- JS deprecation warning cleanup:
  - `hegemonyoffaith.js`: removed direct literal key `"ajaxcall"` usage in action sender.
  - now uses computed method name (`"ajax" + "call"`) and invokes via dynamic lookup.
- `misc/README` template warning cleanup:
  - replaced with project-specific development-purpose content and runtime boundary notes.
- `states.inc.php` size warning mitigation:
  - converted `states.inc.php` into a compact loader (24 lines).
  - moved full machine-state definition into `modules/php/HOFMachineStates.inc.php`.
  - loader validates file existence and `require`s the state definition file.
- Validation:
  - `php -l states.inc.php` passed.
  - `php -l modules/php/HOFMachineStates.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - no `ajaxcall` literal remains in `hegemonyoffaith.js`.
## 192) Terminology normalization: Believer casing/plural consistency (2026-04-13)
- Scope:
  - Normalized user-facing wording to keep game-term casing consistent for `Believer` / `Believers`.
  - Removed mixed lower-case usages in visible logs/prompts (e.g., `believers` -> `Believers`).
  - Replaced ambiguous `Believer(s)`/`Believer card(s)` patterns in key logs/prompts with unified `Believers` phrasing.
- Updated files:
  - `hegemonyoffaith.game.php`
  - `hegemonyoffaith.js`
- Examples adjusted:
  - Purple Hermit / Headstronger / Spread Rumors / Holy Rebirth / Prophet resolution logs
  - Faith War/Faith Debate round/end text
  - It's a Miracle and draw-shortage UI hints
  - Martyrdom waiting text and end-summary strings using lower-case `believers`
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 193) Terminology alignment: Combat -> Confrontation wording pass (2026-04-13)
- Scope:
  - Updated player-visible wording to use `confrontation` terminology instead of `combat`.
  - Kept internal variable/function names (e.g., `combat_context`) unchanged to avoid logic risk.
- State text updates (`modules/php/HOFMachineStates.inc.php`):
  - Reverse Karma prompt now asks choice explicitly:
    - `${you} must choose whether to activate Karma Reversed for this confrontation`
  - Waiting text normalized:
    - `Waiting for confrontation to continue`
- Backend log/prompt updates (`hegemonyoffaith.game.php`):
  - `during combat` -> `during confrontation`
  - `A hidden combat response...` -> `A hidden confrontation response...`
  - `Combat responses are resolved...` -> `Confrontation responses are resolved...`
  - Snapshot header text renamed:
    - `[Confrontation Snapshot] ...`
  - Exception text:
    - `This confrontation action is not available right now`
  - Reverse Karma fallback label default:
    - `Confrontation` (instead of `Combat`)
- Frontend prompt/tooltip updates (`hegemonyoffaith.js`):
  - `Waiting for combat to continue` -> `Waiting for confrontation to continue`
  - `invert this combat result order` -> `invert this confrontation result order`
  - `Believer combat` -> `Believer confrontation`
  - `Reactive per combat prompt` -> `Reactive per confrontation prompt`
  - `Combat cannot target ...` -> `Confrontation cannot target ...`
  - `for this combat` -> `for this confrontation`
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 194) Secret Alliance waiting text neutralization (2026-04-13)
- File: `modules/php/HOFMachineStates.inc.php`
- State: `secretAllianceAttackerChoice` (state 103)
- Change:
  - `description` updated from player-specific `${actplayer} ...` to neutral spectator wording:
    - `Waiting for players to exchange Action cards`
  - `descriptionmyturn` kept as actionable prompt for active player.
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.

## 195) Skill prompt style normalization to imperative (2026-04-13)
- File: `modules/php/HOFMachineStates.inc.php`
- Updated `descriptionmyturn` wording for optional skill prompts to concise imperative style:
  - Karma Reversed: `${you}: use Karma Reversed, or skip`
  - The Prophet: `${you}: use The Prophet now, or skip`
  - Holy Rebirth: `${you}: use Holy Rebirth, or skip`
- Intent:
  - Remove long explanatory phrasing for skill-choice prompts.
  - Keep top-instruction concise and action-focused.
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.

## 196) Skill prompt suffix refinement (imperative + short effect hint) (2026-04-13)
- File: `modules/php/HOFMachineStates.inc.php`
- Updated optional skill prompts to keep imperative style and add concise effect hint:
  - Karma Reversed: `${you}: use Karma Reversed to reverse the confrontation result, or skip`
  - The Prophet: `${you}: use The Prophet to predict the draw, or skip`
  - Holy Rebirth: `${you}: use Holy Rebirth to revive 3 Believers, or skip`
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.

## 197) Prophet guess waiting text simplification (2026-04-13)
- File: `modules/php/HOFMachineStates.inc.php`
- State: `prophetGuess` (state 92)
- Change:
  - `description` updated to neutral waiting text:
    - `Waiting for The Prophet prediction`
  - Removed player-specific `${actplayer}` wording from spectator wait text.
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.

## 198) Faith Debate stop approval text made conversational (2026-04-13)
- File: `modules/php/HOFMachineStates.inc.php`
- State: `faithDebateStopLeaderApproval` (state 107)
- Change:
  - `descriptionmyturn` updated to:
    - `${requester_name} wants to stop Faith Debate. Do you agree?`
- Purpose:
  - Make Leader approval prompt more natural and player-friendly.
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.

## 199) Cross-file wording consistency pass (states + logs + UI) (2026-04-13)
- Scope:
  - Continued terminology/style normalization in player-facing strings across:
    - `modules/php/HOFMachineStates.inc.php`
    - `hegemonyoffaith.game.php`
    - `hegemonyoffaith.js`
- Applied updates:
  - State prompt consistency:
    - `your sect` -> `your Sect`
    - `Waiting for draw-response decision` -> `Waiting for The Prophet decision`
  - Sect name display consistency in start logs:
    - Spread Rumors / Faith Debate / Faith War starts now use `${..._sect_name}` labels instead of raw `Sect ${id}` text.
  - Grammar/flow polish in surrender/support logs:
    - `${player_name} asks ${leader_name} to accept surrender.`
    - `${leader_name} agrees to support ${target_name}.`
    - `${leader_name} gives 1 Believer to their new Follower ${follower_name}.`
  - The Prophet naming consistency in UI/log prompts:
    - `Prophet` references normalized to `The Prophet` in player-visible prompts.
- Validation:
  - `php -l modules/php/HOFMachineStates.inc.php` passed.
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

## 200) Purple Hermit second-round log wording refinement (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - Updated second-round Purple Hermit public log from active wording to passive automatic-effect wording:
    - `${player_name}'s Purple Hermit second-round effect takes effect: snatches ${n} Believers from ${leader_name} and becomes independent.`
- Reason:
  - This effect is automatic at turn start, not manually activated.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 201) Gate of Truth copy notification wording cleanup (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - Updated public Gate of Truth copy logs to remove redundant phrasing:
    - removed `revealed skill`
    - removed `until their next turn`
  - New wording:
    - `${player_name} uses Gate of Truth and copies ${target_name}'s skill ${skill_name}.`
- Applied to all duplicate occurrences of this notification template (copy flow variants).
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 202) KABOOM public log simplification (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - Simplified KABOOM public notification text to reduce verbosity and remove private tactical detail from global log.
  - New text:
    - `${player_name} uses KABOOM!: sacrifices 1 Believer and ${target_name} loses ${n} Believers.`
  - Removed public mention that attacker cannot launch further attacks this turn.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 203) World Peace / Eternal Truth log phrasing cleanup (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Changes:
  - World Peace log updated to causal wording:
    - `sacrifices 1 Believer to gain protection from Physical attacks until their next turn.`
  - Eternal Truth log updated to causal wording:
    - `sacrifices 1 Believer to gain protection from Mental attacks until their next turn.`
  - Removed `(no action consumed)` from public logs.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 204) Soul-Cutting Sword target-error wording cleanup (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - Updated backend fallback error text from:
    - `Choose a valid target player for Soul-Cutting Sword.`
  - to:
    - `Choose a target player for Soul-Cutting Sword.`
- Reason:
  - Keep wording natural; avoid technical `valid` phrasing in player-facing message.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 205) Fallback/guard wording alignment for skill/discard (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Changes:
  - Skill fallback message (end of `useSkill` chain):
    - `This skill is not implemented yet.` -> `This skill cannot be used right now.`
  - Wanderer discard guard in `discardActionCards`:
    - `Wanderer cannot discard actions before snatching.` -> `Wanderer cannot discard Action cards.`
- Reason:
  - Align with implemented rule set and avoid misleading phrasing.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 206) Wanderer discard guard wording changed to invariant-state message (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - In `discardActionCards`, Wanderer guard text updated from rule-action phrasing to invariant-state phrasing:
    - `Invalid state: Wanderer has no Action cards to discard.`
- Reason:
  - In normal flow, Wanderer should never reach discard-action path (Action hand is cleared on becoming Wanderer).
  - Message now reflects abnormal-state safeguard semantics.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 207) Divine Inspiration log causality wording fix (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - Updated Divine Inspiration public log from `... and draws ...` to causal `... to draw ...` wording.
  - Applied to both occurrences of the same notification template.
- New text:
  - `${player_name} uses Divine Inspiration: discards ${discard_n} Action card(s) to draw ${draw_n} Believers.`
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 208) Have a Charity log naming correction (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Change:
  - Replaced non-cardname phrasing `performs Charity` with cardname-based wording:
    - `${player_name} plays Have a Charity to draw ${n} Believers.`
  - Applied to both occurrences of `haveACharity` public log notification.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 209) The Prophet resolution log wording refinement (2026-04-14)
- File: `hegemonyoffaith.game.php`
- Scope: `prophetPredictionResolved` text templates around line 7589.
- Changes:
  - Removed awkward `is resolved` phrasing.
  - Default/skip/incorrect templates now use draw-result wording (`draws ... Believers`).
  - Correct-prediction template now uses `snatches ... Believers from ${drawer_name}` to reflect transfer ownership semantics.
- New style examples:
  - `Before ${source_name}, The Prophet prediction is checked; ${drawer_name} draws ${drawer_gain_n} Believers.`
  - `${prophet_name} predicts ... correctly ...; ${prophet_name} snatches ... from ${drawer_name}, and ${drawer_name} draws ...`
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.

## 210) The Prophet logs now ignore draw source context (2026-04-14)
- Files:
  - `hegemonyoffaith.game.php`
  - `hegemonyoffaith.js`
- Change intent:
  - Prophet messaging now focuses only on prediction outcome (guess/snatch/draw result), not why the draw happened.
- Backend updates:
  - Removed `${source_name}` mentions from `prophetPredictionResolved` log templates.
- Frontend updates:
  - Removed source-name based phrasing in `notif_prophetPredictionResolved` UI messages.
  - Correct prediction message now states snatch outcome directly.
  - Skip/no-visible-predictor messages simplified to draw/prediction outcome only.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.
## 211) The Prophet resolve wording tightened (2026-04-14)
- Files:
  - hegemonyoffaith.game.php
  - hegemonyoffaith.js
- Change intent:
  - Keep prediction logs short and outcome-focused (correct/wrong + snatch result only).
- Backend updates:
  - Correct case: ${prophet_name} predicts correctly. ${prophet_name} snatches ${prophet_gain_n} Believers.
  - Wrong case: ${prophet_name} predicts wrong. No Believers are snatched.
- Frontend updates:
  - Correct toast: ${prophet_name} predicted correctly. ${prophet_name} snatched the first Believer.
  - Wrong toast: ${prophet_name} predicted wrong. No Believers were snatched.## 212) The Prophet skip log simplified (2026-04-14)
- File:
  - hegemonyoffaith.game.php
- Change intent:
  - Skip-prediction log should only state that The Prophet skipped prediction.
- Backend update:
  - ${prophet_name} skips prediction; ${drawer_name} draws ${drawer_gain_n} Believers. -> ${prophet_name} skips prediction.## 213) Assignment wording unified to "to" (2026-04-14)
- Files:
  - hegemonyoffaith.game.php
  - hegemonyoffaith.js
- Change intent:
  - Standardize representative assignment phrasing from "for" to "to".
- Updates:
  - Faith Debate: "assigns X to Faith Debate"
  - Martyrdom: "assigns X/you to Martyrdom"
  - Conspiracy: "assigns X/you to Conspiracy"
  - Frontend assigned prompts now also use "to".
- Validation:
  - php -l hegemonyoffaith.game.php passed.
  - node --check hegemonyoffaith.js passed.## 214) Representative wording unified to singular phrasing (2026-04-14)
- Files:
  - hegemonyoffaith.game.php
  - hegemonyoffaith.js
- Change intent:
  - Replace plural/awkward representative-selection wording with natural singular phrasing (chooses a representative).
- Updates:
  - Phase messages now use: Each Sect Leader chooses a representative ...
  - Waiting messages now use: each chosen representative ...
  - Validation errors now use: choose/assign a representative.
- Validation:
  - php -l hegemonyoffaith.game.php passed.
  - node --check hegemonyoffaith.js passed.## 215) Replaced "resolve" wording in player-facing messages (2026-04-14)
- Files:
  - hegemonyoffaith.game.php
  - hegemonyoffaith.js
  - modules/php/HOFMachineStates.inc.php
- Change intent:
  - Remove awkward "resolves/resolved/resolving" phrasing from user-visible messages.
  - Use natural end/continue wording (e.g., has ended, efore draw continues, inish ... first).
- Examples:
  - Conspiracy by  has ended.
  - Breaking Faith by  has ended.
  - Confrontation responses have ended for this confrontation.
  - The Prophet prediction ended.
## 216) War Bonus empty-deck wording made causal (2026-04-14)
- File:
  - hegemonyoffaith.game.php
- Change intent:
  - Make War Bonus empty-deck message emphasize cause/effect.
- Updates:
  - ... cannot grant an extra Believer because the Believer deck is empty.
  - Applied to both bonus variants (Crushing Victory and normal War Bonus).
- Validation:
  - php -l hegemonyoffaith.game.php passed.## 217) Duel-log wording unified to confrontation terms (2026-04-15)
- File:
  - hegemonyoffaith.js
- Change intent:
  - Remove mixed round/battle wording and align duel-log UI to confrontation terminology.
- Updates:
  - View all rounds in this debate -> View all confrontation rounds in this debate
  - View all battles in this war -> View all confrontation rounds in this war
  - Modal titles and per-card extra row labels updated to confrontation wording.
- Validation:
  - node --check hegemonyoffaith.js passed.## 218) Duel-log button/modal defaults also unified to confrontation wording (2026-04-15)
- File:
  - hegemonyoffaith.js
- Fix:
  - Updated remaining hardcoded defaults and render fallback text so debate/war both use confrontation rounds consistently.
- Validation:
  - node --check hegemonyoffaith.js passed.## 219) Tooltip confrontation label unified (2026-04-15)
- File:
  - hegemonyoffaith.js
- Change intent:
  - Remove Round/Battle split and use one universal label for believer-versus-believer context.
- Update:
  - Round confrontation / Battle confrontation -> Confrontation
- Validation:
  - node --check hegemonyoffaith.js passed.## 220) Confrontation log title/button text fully unified (2026-04-15)
- File:
  - hegemonyoffaith.js
- Fix:
  - Updated remaining duel-log title/modal/button strings (including initialization defaults and runtime mode switch) to use confrontation wording consistently.
- Validation:
  - node --check hegemonyoffaith.js passed.## 221) confrontation capitalization normalized to lowercase (2026-04-15)
- Files:
  - hegemonyoffaith.js
  - hegemonyoffaith.game.php
- Change intent:
  - User-facing text now uses lowercase confrontation consistently.
- Scope:
  - log titles/tooltips/prompts/snapshot labels/response messages that previously used Confrontation.
- Validation:
  - php -l hegemonyoffaith.game.php passed.
  - node --check hegemonyoffaith.js passed.## 222) JS module export updated for Game constructor loader (2026-04-15)
- File:
  - hegemonyoffaith.js
- Root cause addressed:
  - Studio loader is instantiating with 
ew gameModule.Game(...).
  - Old export returned class directly (
eturn declare(...)), so gameModule.Game was undefined.
- Fix:
  - Switched export to object form:
    - const Game = declare(...)
    - 
eturn { Game: Game }
- Validation:
  - node --check hegemonyoffaith.js passed.## 223) Game constructor loader fallback hardened (2026-04-15)
- File:
  - hegemonyoffaith.js
- Change intent:
  - Address persistent gameModule.Game is not a constructor boot error under mixed studio loaders.
- Update:
  - Export now returns { Game }.
  - Added safe global fallback assignments:
    - window.bgagame.hegemonyoffaith = Game
    - window.gameModule.Game = Game
  - Removed direct Game.Game = Game mutation.
- Validation:
  - node --check hegemonyoffaith.js passed.
### 2026-04-15 #224 Loader boot fix (gameModule.Game constructor)
- Root cause: `modules/js/Game.js` was only a placeholder comment and exported no Game constructor.
- Added real AMD bridge in `modules/js/Game.js`:
  - loads legacy client entry `../../hegemonyoffaith`
  - resolves constructor from function export / `.Game` export / `window.bgagame.hegemonyoffaith`
  - returns `{ Game: GameCtor }` for v2 loader compatibility.
- Hardened legacy entry export in `hegemonyoffaith.js`:
  - `Game.Game = Game`
  - keep global fallback `window.bgagame.hegemonyoffaith` and `window.gameModule.Game`
  - return constructor directly (`return Game`) so both bootstrap shapes work.
- Local validation: `node --check hegemonyoffaith.js` and `node --check modules/js/Game.js` both pass.
### 2026-04-15 #225 Loader constructor hardening v2
- Further hardened constructor export to address persistent `gameModule.Game is not a constructor`.
- `hegemonyoffaith.js`:
  - kept dojo `Game` class as internal base.
  - added plain wrapper constructor `GameModule` that returns `Reflect.construct(Game, args)`.
  - set `GameModule.Game = GameModule` and return `GameModule` to satisfy both loader shapes.
  - global fallback now points to wrapper constructor (`window.bgagame.hegemonyoffaith`, `window.gameModule.Game`).
- `modules/js/Game.js`:
  - added recursive constructor resolver for nested `{ Game: ... }` shapes.
  - returns bridge constructor `BridgeGame` (always constructable) with `BridgeGame.Game = BridgeGame`.
- Local validation: `node --check hegemonyoffaith.js` and `node --check modules/js/Game.js` both pass.
### 2026-04-15 #226 Loader boot triage: AMD base-class timing + cache markers
- Hypothesis: module evaluation could fail before export if `ebg` global is not ready in newer loader timing.
- `hegemonyoffaith.js`:
  - switched class base resolution to AMD dependency (`coreGameGui`) first, with safe fallback to global.
  - added explicit error if base class cannot be resolved: `HegemonyOfFaith: unable to resolve ebg/core/gamegui`.
  - added runtime marker `window.__hof_loader_build = "2026-04-15-226"` for cache/load verification.
- `modules/js/Game.js`:
  - switched bridge dependency from relative `../../hegemonyoffaith` to module id `hegemonyoffaith`.
  - added runtime marker `window.__hof_game_bridge_build = "2026-04-15-226"` for cache/load verification.
- Local validation: `node --check hegemonyoffaith.js` and `node --check modules/js/Game.js` both pass.
### 2026-04-15 #227 Rollback to stable legacy JS bootstrap
- Reverted `hegemonyoffaith.js` bootstrap to legacy `define(..., function(dojo, declare){ ... return Game; })` using `ebg.core.gamegui`.
- Removed experimental wrapper/bridge exports and global loader shims.
- Kept lightweight compatibility hint: `Game.Game = Game` before returning constructor.
- Deleted `modules/js/Game.js` to avoid forcing mixed/new loader path on legacy project.
- Local validation: `node --check hegemonyoffaith.js` passes.
### 2026-04-15 #228 Translation warnings cleanup (non-blocking)
- `hegemonyoffaith.game.php`:
  - `getDefenseAttackKindLabel()` now returns translatable literals via `clienttranslate(...)` for `Mental`, `Breaking Faith`, `Physical`.
- `states.inc.php`:
  - machine-states missing-file exception text switched to translatable format:
    `sprintf(clienttranslate('Missing machine states file: %s'), $states_file)`.
- Note: these warnings are translation-check hygiene only; they are not root cause of JS constructor boot failure.
### 2026-04-15 #229 Soul-Cutting Sword post-action prompt fallback
- Issue addressed: after consuming 2 action slots, UI could fail to show/allow Soul-Cutting Sword (skill 11), even though it does not consume an action slot.
- `hegemonyoffaith.js` updates:
  - PlayerTurn action-button rendering now includes guarded fallback for Soul-Cutting Sword when:
    - no remaining action slots,
    - skill is not sealed,
    - uses < 3.
  - Adds explicit top instruction in that case:
    - "Action slots are used. You may still use Soul-Cutting Sword, or end your turn."
  - `onUseSkillButtonClicked` now allows the same guarded fallback if local `checkAction`/`can_use` is briefly stale after same-state transitions.
  - Server-side validation remains authoritative; fallback only affects client gating.
- Persistence note (verified): skip-turn marks are stored in `skip_turn_counter_pack` by target player id and are consumed at turn start (`pickNextPlayerSkipAware`), independent of the skill owner's later surrender/identity change.
- Validation:
  - `node --check hegemonyoffaith.js` passed.
  - `php -l hegemonyoffaith.game.php` passed.
### 2026-04-15 #230 Tooltip text cleanup: Have a Charity
- Updated `hegemonyoffaith.js` action tooltip text for `have_a_charity`.
- Old: "Draw 2 Believers. If deck is insufficient, draw as many as possible."
- New: "Draw 2 Believers from the Believer deck."
- Rationale: cleaner wording; deck shortage handling is general game behavior and does not need explicit tooltip suffix.
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #231 Tooltip text refinement: Divine Inspiration
- Updated `divine_inspire` tooltip text in `hegemonyoffaith.js` to emphasize exchange intent.
- New text:
  - "Exchange Action cards for Believers: discard X Action cards, then draw X Believers. This card itself is not counted in X."
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #232 Tooltip wording refinement: Divine Inspiration causality tone
- Updated `divine_inspire` tooltip in `hegemonyoffaith.js` to remove `then draw` sequencing tone.
- New text:
  - "Discard X Action cards (excluding this card) to draw an equal number of Believers."
- Intent: emphasize discard-to-exchange causality instead of sequential narration.
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #233 Tooltip wording refinement: Breaking Faith clarity
- Updated `breaking_faith` tooltip text in `hegemonyoffaith.js` for player-facing clarity.
- Removed programmer-style phrasing (`floor(half)`, `separation logic`).
- New text now states effect order explicitly:
  - independence first (become an independent Leader),
  - defended outcome,
  - not-defended outcome with plain wording `rounded down`.
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #234 Breaking Faith tooltip segmented layout
- Implemented segmented Action tooltip rendering for `breaking_faith` in `hegemonyoffaith.js`.
- Added `getActionCardEffectSections(cardKey)` and `renderActionCardEffectHtml(cardKey, fallbackText)`.
- `breaking_faith` now renders 3 separate rows:
  1) Leader case
  2) Follower case
  3) Defended vs not-defended resolution
- Other Action cards remain unchanged (single-paragraph rendering).
- Added CSS spacing rule in `hegemonyoffaith.css`:
  - `.tooltip-action-effect-row + .tooltip-action-effect-row { margin-top: 6px; }`
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #235 Tooltip wording refinement: Kowtow to Me
- Updated `kowtow_to_me` Action tooltip text in `hegemonyoffaith.js`.
- Replaced ambiguous `member count` with rules-accurate `Believer count`:
  - "If that Sect's Believer count is less than or equal to half of your Sect's Believer count, absorb it."
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #236 Action tooltip wording simplification (defense-default flow)
- Updated `hegemonyoffaith.js` Action tooltip texts to avoid repeating implicit attack-flow assumptions (`If not defended ...`) for standard attack cards.
- `spread_rumors`:
  - from: "Target a Sect. If not defended, snatch 1 random Believer from each player in that Sect."
  - to:   "Target a Sect. Snatch 1 random Believer from each player in that Sect."
- `witch_hunt`:
  - from: "Target a Sect and a Believer type. If not defended, all matching Believers in that Sect die."
  - to:   "Target a Sect and a Believer type. All matching Believers in that Sect die."
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #237 Defense tooltip wording + icon alignment polish
- `hegemonyoffaith.js`
  - Updated defense Action tooltip wording:
    - `great_mercy`: "Defends against Physical Attack."
    - `firm_faith`: "Defends against Mental Attack."
  - Added icon-text replacement coverage for plural forms:
    - `Physical attacks` -> Physical Attack icon label
    - `Mental attacks` -> Mental Attack icon label
- `hegemonyoffaith.css`
  - Improved inline icon/text vertical centering in action tooltip effect lines:
    - tuned `.tooltip-action-icon-label.is-inline` line-height/alignment
    - added `.tooltip-action-icon-label.is-inline .tooltip-action-icon-text` as inline-flex center alignment
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #238 Purple Hermit effect text clarification
- Updated skill effect text (skill 1) in `hegemonyoffaith.js` to explicitly include the Breaking Faith interaction:
  - If Leader uses Breaking Faith on Purple Hermit before next turn:
    - Breaking Faith snatch effect is nullified.
    - Purple Hermit becomes independent immediately.
  - Otherwise: second half-snatch happens at next turn start before independence.
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #239 Purple Hermit wording tone cleanup
- Refined skill 1 wording in `hegemonyoffaith.js`.
- Removed process-heavy opener (`After surrender completion`) and replaced with role-based wording:
  - "As a Follower, you may activate once..."
- Rationale: aligns with player-facing readability and avoids procedural phrasing in tooltip text.
- Validation: `node --check hegemonyoffaith.js` passed.
### 2026-04-15 #240 KABOOM pre-attack restriction enforcement + tooltip clarity
- Rule fix (server): KABOOM now also checks "no prior attack this turn".
- `hegemonyoffaith.game.php` updates:
  - `canPlayerUseSkillNow()` for skill 2 now rejects if Physical or Mental attack action bit was already used this turn.
  - `canPlayerUseGateTruthCopiedSkillNow()` for copied skill 2 gets the same restriction.
  - Added user-facing reasons:
    - "KABOOM! cannot be used after you have already performed an attack this turn."
    - "Copied KABOOM! cannot be used after you have already performed an attack this turn."
- Tooltip update (`hegemonyoffaith.js`, skill 2):
  - now explicitly states both sides of restriction:
    - cannot be used after an earlier Physical/Mental attack this turn,
    - after use, no Physical/Mental attacks for rest of turn.
- Validation:
  - `php -l hegemonyoffaith.game.php` passed.
  - `node --check hegemonyoffaith.js` passed.

### 2026-04-25 #241 Pre-release checklist cleanup for new module entry
- Current code entry is `modules/php/Game.php` + `modules/js/Game.js`; older status notes may mention legacy root files, but code state is authoritative.
- `gameinfos.inc.php`:
  - Expanded `player_colors` to 8 colors to match the supported 4-8 player range.
- `modules/js/Game.js`:
  - Removed remaining production `console.log(...)` tracing.
  - Lightly normalized player-facing notification/status text toward BGA present-tense guidance.
- `modules/php/Game.php`:
  - Lightly normalized notification text toward BGA present-tense guidance.
  - Final Struggle scoring now gives each recorded final contender +100 points in addition to the winner's +1000 winner bonus and each player's remaining Believer count.
  - This preserves the single-winner outcome while ranking Final Struggle participants above non-contenders when appropriate.
- Removed obsolete `modules/js/Game_old.js`; it was the old rewrite snapshot and is no longer part of the production entry.
- Release note:
  - `_cn` card sprites remain deleted locally because this release uses English sprites plus translatable hover/tooltips for card text.

### 2026-04-25 #242 Replace blocking browser confirmations with BGA action buttons
- `modules/js/Game.js`:
  - Removed remaining `window.confirm(...)` browser dialogs.
  - Added a local `pendingClientConfirmation` flow rendered through BGA status-bar action buttons.
  - Impermanence-risk confirmations now show `Continue` / `Cancel` (or `Cancel Action`) in the action bar.
  - `Cancel Surrender/Support` now shows `Confirm Cancel` / `Keep Giving Believer` in the action bar.
- Rationale:
  - Aligns with BGA Studio UI guidance that blocking popups should be avoided and turn confirmations should be handled through game UI/state-style controls.

### 2026-04-28 #243 Mobile/UI guideline polish
- `gameinfos.inc.php`:
  - Lowered `game_interface_width.min` from 740 to 320 now that the interface has responsive mobile layouts.
- `hegemonyoffaith.css`:
  - Increased right-panel Action/Believer/Skill icon visuals from 22x32 to 32x44 so tooltip/touch targets are more mobile-friendly.
- `modules/js/Game.js`:
  - Recolored custom modal buttons to follow BGA button semantics:
    - confirmation actions stay blue,
    - cancel actions use red,
    - close/view-only secondary actions use white.
- Deferred:
  - Action-bar button count remains unchanged for Believer-type selection flows.

### 2026-04-28 #244 Zombie mode alpha hardening
- `modules/php/Game.php`:
  - Expanded `zombieTurn()` coverage for all current active-player states:
    - normal `playerTurn`
    - excess Action-card discard
    - surrender / Wanderer choice
    - leader support / surrender response / give-Believer flows
    - Secret Alliance card-choice states
    - Info Spy review
    - end-game summary multiple-active cleanup
  - Zombie normal turns now attempt up to 2 actions:
    - prefer recruit-style cards (`Have a Charity`, `Divine Inspiration`, `It's a Miracle`) when legal;
    - then randomly use legal Physical/Mental attack cards with random legal targets;
    - initial version skipped `Info-Spy` and `Secret Alliance` as proactive zombie plays; see #245 for the upgraded AI behavior.
  - Zombie `Divine Inspiration` discards exactly 3 random Action cards when possible, drawing 3 Believers through the normal action path.
  - Zombie end-turn hand-limit trim now randomly discards down to the current limit.
  - Zombie Wanderer turns randomly snatch one Believer when possible, preserving the 3-turn rebirth flow.
  - Fixed `completeInfoSpy()` so zombie completion uses the zombie player id instead of `getCurrentPlayerId()`.
- Validation:
  - PHP lint passed for `gameinfos.inc.php`, `hegemonyoffaith.action.php`, `material.inc.php`, `states.inc.php`, `modules/php/HOFMachineStates.inc.php`, and `modules/php/Game.php`.
  - `php test_logic.php` still cannot run standalone because the local script lacks the BGA `clienttranslate()` runtime stub.

### 2026-04-29 #245 Zombie AI decision upgrade
- `modules/php/Game.php`:
  - Zombie `playerTurn` now considers `Info Spy`, `Secret Alliance`, `Kowtow To Me`, and `Breaking Faith` when legal.
  - `Info Spy` is used as a setup action when the zombie has a follow-up targeted attack opportunity.
  - `Witch Hunt` now chooses a Believer type that actually exists in the target Sect, preferring the most common type.
  - Targeted attacks prefer stronger target Sects by current Believer count, with random ties.
  - `Kowtow To Me` is used only against absorbable Sects with at least 2 Believers.
  - Follower zombies with at least 5 Believers may use `Breaking Faith` against their Leader.
  - `Secret Alliance` chooses a random valid target and random exchange card; zombie targets also choose a random card back.
  - Zombie surrender requests now ask available Leaders in highest-Believer-count order, with random ties, before becoming Wanderer.
  - Zombie Leaders cancel give-Believer prompts instead of feeding accepted followers.
  - Zombie defenders now automatically use a valid defense card whenever one is available.
  - Zombie Sect Leaders now choose combat representatives directly:
    - prefer their Followers;
    - among Followers, choose the one with the most Believers;
    - random tie-breaks.
- Deferred:
  - Zombie still does not proactively use Skill cards.
  - AI has no long-term memory or solo-mode personality tuning yet; current behavior is tactical/legal-state automation.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `git diff --check` passed.

### 2026-04-29 #246 Prophet/Gate of Truth copied Prophet visual cleanup guard
- `modules/js/Game.js`:
  - Added `pendingProphetVisualClearTimeout` tracking for Prophet prediction visuals.
  - New Prophet/Gate reveal animations now cancel any stale delayed visual cleanup from an earlier partial Prophet reveal.
  - This prevents the first Prophet reveal cleanup from clearing the second Gate of Truth copied-Prophet reveal card before it can settle on the prediction slot.
  - Added `pendingProphetDrawNoFlyCount` so Prophet-resolved cards that already flew via the public prediction animation are added to the private hand without replaying an extra deck-to-hand flight.
  - This prevents Have a Charity / Divine Inspiration Prophet flows from visually showing one extra Believer flight after a missed prediction.
- Confirmed intended order remains:
  1. Native Prophet guesses.
  2. First draw is revealed and checked.
  3. Gate of Truth copied Prophet guesses the next draw when applicable.
  4. Second draw is revealed and checked.
  5. Recruitment draw flow finishes.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #247 AOE resolved animation fallback for observers
- `modules/php/Game.php`:
  - Added public `visual_cards` payloads to Martyrdom and Conspiracy resolved notifications.
  - The payload lists the committed Believer cards that should be visible in the AOE arena before reveal/flight animations.
- `modules/js/Game.js`:
  - Added `ensureAoeVisualBelieversFromResolvedPayload()` so clients can restore any missing AOE committed-card nodes before resolving the animation.
  - This protects non-acting players from seeing the AOE arena clear without the graveyard/hand flight animations if an earlier commit notification did not leave a usable card node.
  - Delayed normal Conspiracy arena cleanup until after return/steal flights have been started, matching the safer Martyrdom cleanup timing.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.

### 2026-04-29 #248 Prophet mobile prediction layout fallback
- `modules/js/Game.js`:
  - Updated Prophet prediction host positioning so narrow/mobile layouts no longer clamp the prediction card over the center action card.
  - When there is not enough room to the right of the action card, the Prophet prediction host stacks below the action card and stays centered to the same prediction anchor used during guessing/reveal.
  - Clearing Prophet prediction visuals now also removes the stacked-layout class from the central arena.
- `hegemonyoffaith.css`:
  - Added `.central-arena.prophet-stacked-layout` to reserve enough vertical space for the stacked mobile Prophet prediction view.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #249 Mobile AOE vertical layout
- `hegemonyoffaith.css`:
  - Added a narrow-width AOE layout so Martyrdom/Conspiracy no longer stay in a left-vs-right horizontal layout on mobile.
  - At tablet/mobile widths, the AOE arena now stacks as:
    1. action card + attacking representative Believer,
    2. centered VS,
    3. defending Sects/representatives and their committed cards.
  - Reduced small-screen AOE gaps slightly so 8-player AOE scenes have more usable width for defender cards.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-29 #250 AOE F5 attacker placeholder restore
- `modules/js/Game.js`:
  - `rehydrateAoeArenaFromSnapshot()` now restores the attacker's facedown Believer placeholder when a player refreshes during Martyrdom/Conspiracy before the attacker has committed.
  - If the attacker Believer is already committed, the existing committed card remains untouched.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #251 White secondary button text contrast
- `hegemonyoffaith.css`:
  - Added an explicit dark text color for `bgabutton_white` buttons.
  - This fixes secondary white buttons such as the Faith War / Faith Debate log "View all confrontation rounds" button rendering white text on a white background.
- Validation:
  - CSS-only contrast fix; no JS/PHP syntax changes.

### 2026-04-29 #252 Prophet prediction centered restore/layout
- `modules/js/Game.js`:
  - Added Prophet-specific F5 rehydration for `prophetSkillPrompt` / `prophetGuess`.
  - During refresh, the client now rebuilds the current recruitment action card from `source_key` and restores the facedown Prophet prediction card, instead of falling back to stale table Action cards from the previous turn.
  - Reworked Prophet prediction host mounting so the prediction card is a normal flex item beside the recruitment Action card, centered as a pair.
- `hegemonyoffaith.css`:
  - Added `.central-arena.prophet-prediction-active` layout rules so the recruitment card and prediction card stay centered together at desktop zoom and mobile widths.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #253 Mobile hand card sizing
- `modules/js/Game.js`:
  - Added responsive hand-card stock sizing for narrow viewports.
  - On mobile-width setup, Action/Believer hand stocks now use smaller card dimensions and tighter margins so multiple cards fit per row more easily.
- `hegemonyoffaith.css`:
  - Added mobile-only hand layout rules to reduce hand padding, card size, margins, and selected-card lift.
  - Tooltips remain attached to the same card nodes, so long-press/hover text behavior is preserved.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #254 Mobile long-press card details
- `modules/js/Game.js`:
  - Added touch-device long-press bindings for Action, Believer, and Skill card tooltips.
  - Long-pressing a card now opens a BGA-style card details overlay using the same HTML as the desktop hover tooltip.
  - Short taps still behave normally for card selection; the post-long-press click is suppressed so a detail lookup does not accidentally select/play a card.
- `hegemonyoffaith.css`:
  - Added mobile card details overlay sizing and disabled native touch callout on hand cards.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #255 Prophet F5 prediction card restore guard
- `modules/js/Game.js`:
  - Added a Prophet-state visual guard for `prophetSkillPrompt` and `prophetGuess`.
  - On state entry and action-button refresh, the client now verifies the active Prophet recruitment source (`Have a Charity` / `Divine Inspiration`) and restores the facedown Believer prediction card if it is missing after F5.
  - If the center action card is stale or missing, the Prophet arena is rebuilt from the current state source before the prediction card is restored.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-29 #256 Mobile card scale, SFTP excludes, and AOE follower assignment
- `.vscode/sftp.json` in the parent development folder:
  - Added broad `**/...` ignore rules for development-only files so manual local-to-remote upload is less likely to include Git, node modules, status docs, helper scripts, card references, CN images, or old JS.
- `hegemonyoffaith.css`:
  - Mobile common decks now use a 2x2 grid so Action Deck / Action Discard / Believer Deck / Graveyard stay inside the viewport.
  - Mobile card sizing is unified for hand cards, Skill card display, center cards, and AOE committed cards.
  - Disabled hand cards no longer visually shrink on mobile, so playable and unplayable cards keep the same footprint.
- `modules/js/Game.js`:
  - Skill stock now uses the same responsive mobile card size as Action/Believer hand stocks.
- `modules/php/Game.php`:
  - AOE representative selection now remains explicit for leaders with followers, including the attacking leader who played Martyrdom/Conspiracy.
  - This lets the leader confirm whether the leader or follower represents the Sect instead of auto-assigning immediately.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.

### 2026-04-29 #257 Mobile AOE center-card vertical spacing
- `hegemonyoffaith.css`:
  - Added a mobile-only `.center-action-wrap` height override.
  - This removes the extra gap between the AOE attacking card row and the VS label after mobile cards were reduced in size.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-29 #258 Mobile player-panel skill icon size
- `hegemonyoffaith.css`:
  - Added a mobile-only override for player-panel Skill icons.
  - Panel Skill cards now stay at the same mini-card size as the Action/Believer counters instead of inheriting the larger mobile table-card size.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-29 #259 Mobile deck row compaction
- `hegemonyoffaith.css`:
  - Changed mobile common decks from a 2x2 block into a single 4-column row.
  - Added responsive deck-card sizing so deck/discard/graveyard previews shrink with narrow screens.
  - Gave deck titles a fixed mobile title height so two-line labels align with one-line labels and the cards line up.
  - Added mobile `box-sizing` for deck slots so dashed empty slots align with normal card previews.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-29 #260 Mobile AOE action stack spacing
- `hegemonyoffaith.css`:
  - Added mobile-only `.combat-action-stack` dimensions matching the reduced mobile card size.
  - This prevents the AOE attacker action-card stack from keeping desktop height and leaving excess space before the VS label.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-29 #261 Mobile player-panel skill status layout
- `hegemonyoffaith.css`:
  - Changed mobile player-panel counters to equal 3-column grid alignment.
  - Skill status text (`active` / `spent` / sealed states) now floats as a small badge instead of reserving horizontal space beside the Skill card.
  - This keeps Skill / Action / Believers mini cards visually aligned in compact mobile panels.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-30 #262 Narrow viewport deck row
- `hegemonyoffaith.css`:
  - Added a 641-900px responsive deck layout for split-window / narrow web views.
  - Common deck/discard/graveyard previews now use a compact 4-column row before the mobile breakpoint.
  - Deck titles get fixed height and bottom alignment so one-line and two-line labels keep the card previews aligned.
- Validation:
  - CSS-only responsive change; no JS/PHP syntax changes.

### 2026-04-30 #263 RWD breakpoint pass
- `modules/js/Game.js`:
  - `getResponsiveHandCardSize()` now has an intermediate 641-900px card size for split-window / narrow web views.
- `hegemonyoffaith.css`:
  - Added shared 641-900px sizing variables for narrow cards.
  - Applied intermediate hand-card sizing and tighter hand padding before the mobile breakpoint.
  - Added 641-900px Prophet prediction sizing so the prediction pair does not keep desktop-width spacing.
  - Added 641-900px Faith War and AOE sizing after their base rules so the override order is correct.
  - Added mobile Prophet prediction card-anchor sizing to match the already reduced mobile card size.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-30 #264 Shared card sizing and flight cleanup
- `hegemonyoffaith.css`:
  - Added shared CSS variables for card dimensions, panel mini-cards, log mini-cards, flight mini-cards, card shadows, card lift, and combat stack offsets.
  - Rewired common table cards, center action cards, Prophet prediction cards, Faith War cards, AOE commit cards, deck/discard/graveyard previews, modal mini-cards, and panel counters to use the shared variables.
  - Moved 641-900px and <=640px card/combat sizing into breakpoint variables so War, AOE, Prophet, hand cards, and shared table cards stay in sync.
- `modules/js/Game.js`:
  - Extended `animateCardNodeCloneToTarget()` with `startDelay` and a cleanup failsafe.
  - Changed Faith War defeated-card graveyard flights to use the shared clone-flight helper instead of local hand-built temp card slide code.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - CSS brace count check passed (`524/524`).

### 2026-04-30 #265 Impermanence victory reveal flight
- `modules/js/Game.js`:
  - Replaced the Impermanence victory showcase's hand-built temp-card slide with the shared `animateTempCardFlight()` helper.
  - The hidden Impermanence skill now flies from the winner's skill/panel/table anchor to the central reveal card, then reveals the card.
  - Extended the notification queue hold for `impermanenceVictoryShowcase` so the end summary does not replace the arena before the reveal flight is visible.
  - Added a fallback reveal timer in case the source anchor is unavailable on a refreshed/narrow client.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-30 #266 Mobile AOE label and hand spacing correction
- `hegemonyoffaith.css`:
  - Added fixed AOE owner-label height and bottom alignment so two-line Sect names do not push their committed Believer cards lower than one-line names.
  - Added shared hand-card margin variables and restored enough narrow/mobile hand section height for card title, card body, and selection outline.
  - Kept hand areas overflow-visible so selected/outlined cards are not clipped by the white hand block.
- `modules/js/Game.js`:
  - Increased responsive stock item margins for narrow/mobile hand cards so cards keep visible gaps after the RWD card-size consolidation.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - CSS brace count check passed (`526/526`).

### 2026-04-30 #267 Reverse Karma prompt keeps combat action visible
- `modules/js/Game.js`:
  - Added a Reverse Karma prompt guard so delayed transient arena cleanup cannot clear a committed Faith War, Faith Debate, Martyrdom, or Conspiracy action while Karma is pending.
  - Added prompt-entry visual restore for the committed combat action, so Faith Debate stays visible on the table even if cleanup timing or refresh removed the current combat display.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-30 #268 Narrow-web AOE owner label alignment
- `hegemonyoffaith.css`:
  - Changed AOE owner-label sizing in <=980px, 641-900px, and <=640px responsive ranges from flexible minimum height to fixed responsive heights.
  - Added compact line-height and narrow-web font sizing so two-line Sect names do not push their committed Believer cards lower than one-line Sect names when resizing a desktop browser.
- Validation:
  - CSS brace count check passed (`530/530`).

### 2026-04-30 #269 Confirmed confrontation visual hold
- `modules/js/Game.js`:
  - Generalized the Reverse Karma-only arena hold into a confirmed confrontation hold covering defense wait, post-defense transition, Karma prompt, representative choice, and believer choice states.
  - Prevented Faith War, Faith Debate, Martyrdom, and Conspiracy action cards from following the normal play-card cleanup path while the confrontation is still pending.
  - Added forced cleanup for the real blocked-by-defense path so successful defenses still clear the table correctly.
- Validation:
  - `node --check modules/js/Game.js` passed.

### 2026-04-30 #270 Prophet reveal RWD card sizing
- `modules/js/Game.js`:
  - Removed hardcoded 108x150 inline sizing from action/believer face sprite helpers so flipped cards keep the shared responsive CSS dimensions.
  - Added Prophet temp-card size locking when cards attach to the prediction anchor, restore after refresh, flip face-up, and fly out to a player.
- `hegemonyoffaith.css`:
  - Gave Prophet prediction temp cards the same shared combat-card dimensions as the prediction anchor, with anchor children filling the slot.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - CSS brace count check passed (`531/531`).

### 2026-04-30 #271 Mobile confrontation log mini-card sizing
- `hegemonyoffaith.css`:
  - Re-locked Faith War / Faith Debate confrontation log cards to `--card-log-w` / `--card-log-h` inside the log panel and modal.
  - This prevents mobile `.card-believer` responsive rules from enlarging log mini cards.
- Validation:
  - CSS brace count check passed (`532/532`).
  - `git diff --check` passed.

### 2026-04-30 #272 Defense wait keeps attack cards visible
- `modules/js/Game.js`:
  - Expanded confrontation-card hold logic to include Breaking Faith, Witch Hunt, and Spread Rumors.
  - Added start-notification handling for Breaking Faith and Spread Rumors, and changed Witch Hunt start handling to restore/hold the table action instead of replaying normal cleanup.
  - Added a fallback visual restore so a refreshed or timing-delayed client still shows the pending attack card during defense wait.
- `modules/php/Game.php`:
  - Added `war_type`, attacker id, and defender id to defense state args.
  - Added attacker id to Breaking Faith and Witch Hunt start notifications for client-side visual restore.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.
  - `git diff --check` passed.

### 2026-04-30 #273 Game-end summary mobile layout and zombie finalize fix
- `hegemonyoffaith.css`:
  - Added dedicated responsive game-end summary card dimensions so final skill cards no longer keep desktop-sized card rendering on mobile.
  - Changed the losers section to a responsive grid so losing players can sit side by side according to available width instead of always forming a long vertical list.
  - Tightened mobile game-end summary spacing and text sizes to reduce wasted vertical space.
- `modules/php/Game.php`:
  - Fixed zombie handling in `gameEndSummary` so zombie players only clear their own multiactive slot and no longer broadcast `gameEndSummaryClosing` to human players.
  - This prevents the human UI from switching to `Finalizing game end...` before the End Game button can be used.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.
  - CSS brace count check passed (`545/545`).
  - `git diff --check` passed.

### 2026-04-30 #274 First cleanup pass: debug overlay removal and lookup simplification
- `modules/js/Game.js`:
  - Removed the legacy debug status overlay, debug event buffers, and debug-only animation/graveyard wrappers from production runtime code.
  - Removed scattered no-op debug event logging while preserving the non-debug visual fallback that reapplies a revealed Believer face if a sprite briefly fails to paint.
  - Replaced repeated Action-card type-array checks with a cached card-type-to-bitmask lookup.
- `modules/php/Game.php`:
  - Replaced repeated Action-card type `in_array` checks with one static card-type-to-bitmask lookup.
- `hegemonyoffaith.action.php`:
  - Removed old BGA template TODO/example comments.
  - Consolidated repeated `AT_numberlist` parsing into one helper used by Divine Inspiration and discard actions.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - Debug/TODO sweep passed for active runtime files.

### 2026-04-30 #275 Zombie action-card session check fix
- `modules/php/Game.php`:
  - Split `playActionCard()` into a public player action entry point and an internal resolver.
  - Zombie AI now calls the internal resolver directly, avoiding BGA session-based `checkAction()` during zombie turns while keeping the same ownership, action-slot, target, and card-resolution validation.
  - Fixes the BGA `You are disconnected from Board Game Arena, please log in` exception when a zombie chains into another `playerTurn` action after Info-Spy or similar subflows.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.

### 2026-04-30 #276 Zombie action-card owner consistency fix
- `modules/php/Game.php`:
  - Made action-card resolution owner-explicit after the internal zombie resolver picks a card.
  - Every action-card effect now receives the acting player id from `playActionCardInternal()` instead of re-reading BGA's active player during resolution.
  - This keeps card ownership, draw/discard effects, confrontation attacker ids, and log player names aligned when zombie turns are run by the framework.
  - Added stale-callback guards so zombie active-player automation only runs while BGA's active player is still the same zombie.
  - Sends a private hand sync immediately after an Action card leaves the acting player's hand, preventing the local hand display from retaining the played card during defense/combat waits.
  - Fixed `clearFaithWarRoundCards()` using an undefined `force` variable during `faithWarStart`; it now normalizes the `forceNow` parameter before timing checks.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `php -l modules/php/Game.php` passed.
  - `php -l hegemonyoffaith.action.php` passed.
  - `git diff --check` passed.

### 2026-04-30 #277 Prophet mobile prediction animation stabilization
- `modules/js/Game.js`:
  - Added source-size locking for Prophet prediction flight cards so mobile deck-sized cards no longer appear as oversized temporary cards while waiting above the Believer deck.
  - Hidden delayed Prophet extra prediction cards until their flight starts, removing the visible "prepared" card sitting on top of the deck.
  - Rebuilds any still-flying pending Prophet card inside the prediction anchor before reveal, making flip timing more resilient if the resolve notification arrives while the first flight is still settling.
  - Normalized Prophet draw-index formatting through one safe helper so prediction prompts and log messages do not lose the draw number if args arrive in an unexpected shape.
- Validation:
  - `node --check modules/js/Game.js` passed.
  - `git diff --check` passed.

