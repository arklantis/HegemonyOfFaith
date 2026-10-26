# Release notes

## 2026-10-27 — Beta end-game recovery hotfix

Fix end-game results not appearing after refresh or reconnect, and restore the missing finish-game button.

- State 102 now supplies the result snapshot so the client can reconstruct the end-game screen without relying solely on a notification.
- The end-game screen takes precedence over stale cards in the central arena.
- Restore the active player's finish control through the state presentation dispatcher.
- Preserve existing rules, scoring, state IDs and database schema. Debug tools remain disabled.

Validation: automated regression tests reproduce the missing recovery/control before the fix; full project checks pass after the fix. Yen reports normal game completion in Studio. The precise original trigger at table 936574588 remains unconfirmed. Already-abandoned games are not automatically restored.

Deploy the four runtime files listed in `BUG_END_SUMMARY_936574588.md` through the BGA build/deploy workflow. GitHub synchronisation does not deploy to BGA.

PHP runtime security updates are separate follow-up work; this release does not patch or upgrade PHP itself.
