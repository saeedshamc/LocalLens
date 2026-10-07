# LocalLens Improvements Roadmap (post-1.0.0)

Post-stable enhancements delivered as minor versions. Each milestone ends with lint, typecheck, test, build, CHANGELOG update, version bump, and an annotated tag.

## Versions

| Version | Focus |
|---------|--------|
| 1.1.0 | Translation progress badge, cache clear in Settings, element-action preview + Apply |
| 1.2.0 | Source-language heuristic, short chat memory, explain model, overlay translation mode |
| 1.3.0 | Long-lived translate port, MutationObserver queue / rate limits |
| 1.4.0 | Icons, Firefox build scripts, store/privacy docs |

## 1.1.0 — UX core

- Report lazy translation progress (`done` / `pending`) to the background; show `chrome.action` badge and popup status.
- Options: estimate IndexedDB cache size; clear translations, embeddings, chat history, or all.
- Element Translate / Explain / Summarize open results in the side panel first; **Apply to page** only for translate; **Discard** clears the preview.

## 1.2.0 — Quality

- Heuristic source-language detection (Arabic/Persian script vs Latin). Warn and skip when page already matches target language; popup offers “translate anyway”.
- Chat: include last `chatHistoryTurns` messages (default 6) in the Ollama prompt.
- Optional `explainModel` for explain/summarize (falls back to chat model).
- `translationMode`: `replace` (default) or `overlay` (Shadow DOM layers; originals unchanged).

## 1.3.0 — Reliability

- Page translation batches over `chrome.runtime.connect({ name: 'locallens-translate' })`.
- Debounce (~300ms) new MutationObserver nodes, max queue size, minimum interval between Ollama batches.

## 1.4.0 — Polish / release prep

- Clearer extension icons.
- `build:firefox` / `zip:firefox` and gecko settings.
- `docs/STORE.md` and `docs/PRIVACY.md` (no live store publish).

## Out of scope

- Actual Chrome Web Store / AMO submission
- Cloud models or telemetry
- Full UI redesign

## Definition of done (per milestone)

- `npm run lint`, `typecheck`, `test`, `build` pass
- Version synced in `package.json` and extension manifest
- CHANGELOG updated; tag `vX.Y.Z`
- Conventional Commits; no tool attribution in messages or docs
