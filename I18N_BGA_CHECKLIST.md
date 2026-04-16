# BGA i18n Checklist (Hegemony of Faith)

This file tracks the translation rules we enforce for BGA and how to audit keys.

## Core rules (from BGA Translations doc)

1. Server-visible strings must be literal English strings inside `clienttranslate('...')`.
2. JS-visible strings must be literal English strings inside `_('...')`.
3. Do not compose translatable sentences using concatenation.
4. For notification/state-description arguments that are themselves translatable text, pass an `i18n` argument array.
5. For game options/statistics strings (main-site context), use `totranslate(...)`.

Reference:
- https://en.doc.boardgamearena.com/Translations

## Local extraction / audit

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\misc\extract_i18n_keys.ps1
```

Generated files:
- `misc/i18n_keys_all.txt`: all literal keys found in `clienttranslate(...)` and `_(...)`.
- `misc/i18n_keys_fragments.txt`: likely fragmented keys (leading/trailing spaces, lowercase sentence fragments, etc.) that often indicate concatenation-style localization debt.

## Current normalization focus

1. Remove invalid `clienttranslate(...)` usage with concatenation / dynamic expressions.
2. Prefer full sentence templates with placeholders, for example:
   - `_("Choose a target Sect for ${card_name}, or cancel.")`
   - instead of separate `_('Choose...') + cardName + _('...')`.
3. Ensure fixed UI labels created in JS setup are wrapped by `_()` and inserted as translated text.
