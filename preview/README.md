# Card tooltip preview

Open http://127.0.0.1:8765/preview/ while the local server is running.

To restart it, run from the game repository root:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

This is static HTML/JS; no PHP execution or BGA login is needed. The local HTTP server is required for ES module loading.

Each category initially selects the longest English effect description from the current Game.js renderer (ties use the lowest ID), showing the same card in Chinese and English. Chinese comes from BGA_TRANSLATIONS_ZH_TW.md. Believers compare the two relationship rows. The tooltip is shown next to desktop medium-size and mobile hand-size copies of the same rendered card.

Edit ../hegemonyoffaith.css directly. The preview reloads that stylesheet every second when it changes. Card internals are not restyled in the demo. Current production CSS hides card text below or equal to 78px width, including mobile hand cards; the demo preserves that behaviour. Desktop medium card width is 90px, tooltip width is 250px, and mobile hand width is capped at 70px. cqw text sizing scales with card width.

Refresh the page after editing JS or translations. Changes to local CSS affect local game files, but BGA production still requires your normal upload/build/deploy steps. Do not upload this preview folder as game runtime code.

`node preview/smoke.cjs` checks the actual tooltip builders and translation coverage for all six selections. It does not verify browser layout.

Each category has one shared card selector for Chinese and English. Selection refreshes both languages and their comparison cards together without reloading the iframe.
