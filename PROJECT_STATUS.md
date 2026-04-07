# Hegemony of Faith - Project Status Snapshot

Last updated: 2026-04-07
Project root (fixed): `D:\Game_develop\BGA_Faith`

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
    - `KABOOM!` (skill 2): consume 1 action, sacrifice 1 selected believer, kill up to 3 believers from a selected player, and lock that target's Physical/Mental attacks for that target turn.
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
