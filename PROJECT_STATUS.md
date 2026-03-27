# Hegemony of Faith - Project Status Snapshot

Last updated: 2026-03-27
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
  - Implemented skill `Soul Severing Sword` (11):
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
7. Soul Severing Sword:
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
