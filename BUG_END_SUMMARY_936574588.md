# End summary unavailable after reconnect — table 936574588

Investigated 2026-10-27. Beta hotfix prepared for GitHub synchronisation. Yen reports uploading the fix to Studio and successfully testing normal game completion. Production deployment is managed manually by Yen and has not been independently verified here.

## Evidence

- Report screenshot records state 102 (`gameEndSummary`), move 107. Players reported that a winner had been announced but they could not end the game.
- Live table inspection now shows move 108 and an abandoned game. The log announces Shornilia as winner before all players abandon. The final-board tab reconstructs Secret Alliance in the centre.
- This abandoned table is no longer a live reproduction of state 102. A new deployment will not restore its result automatically.

## Confirmed defects

- `projectStatePresentation` listed `gameEndSummary` as a presenter but did not allow its controls. An active player's End Game fallback was never dispatched. `node tests/state_presentation_test.js` reproduced this as `[]` instead of `["gameEndSummary"]`.
- State 102 had no state-argument provider. Its summary existed only in a one-time notification, so reconnect/setup could not restore it. `node tests/game_end_reconnect_test.js` reproduced the missing summary on state entry.
- Arena rehydration fell back to the first `cardsontable` action, allowing an old Secret Alliance to appear instead of the missing summary. The stale card is not evidence that the server was still in a Secret Alliance state.

## Fix and verification

- Enable state 102 controls for active participants.
- Reuse one read-only PHP summary builder for the live notification and state arguments.
- Restore the summary on setup/state entry; terminal state 102 takes precedence over stale table cards. Avoid restarting the countdown if the summary is already present.
- PHP fixture verifies live/reload payload equality, winner/counts/final-war metadata, and no notifications or automation on read.
- Full `npm run check` passed. Yen subsequently reported successful normal endings in Studio. The original player's exact trigger remains unknown; reconnect/notification-loss recovery is covered by the automated regression tests, not claimed as reproduced on the reported live table. Additional Studio coverage: refresh as a player and spectator during state 102, and verify a Final Struggle ending.

Runtime upload files: `modules/js/Game.js`, `modules/js/StatePresentation.js`, `modules/php/Game.php`, `modules/php/HOFMachineStates.inc.php`.
