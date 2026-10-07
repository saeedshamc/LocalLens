# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-10-07

### Added

- Voice: read aloud and translate-then-read from the element picker (system TTS via `chrome.tts`).
- Voice input in the side panel chat (browser Speech Recognition) with privacy notice.
- Speak / stop controls for chat replies and element previews; optional auto-speak replies.
- Voice settings: enable TTS, speech rate, STT language, auto-speak.

## [1.4.0] - 2026-10-07

### Added

- Clearer toolbar icons (lens ring + L mark); regenerate via `npm run icons`.
- Firefox build scripts (`build:firefox` / `zip:firefox`) and `browser_specific_settings.gecko`.
- Store listing checklist (`docs/STORE.md`) and privacy policy (`docs/PRIVACY.md`).

## [1.3.0] - 2026-10-07

### Added

- Long-lived `locallens-translate` port for whole-page translation batches.
- MutationObserver debounce, max block queue, and minimum interval between Ollama batches.

## [1.2.0] - 2026-10-07

### Added

- Heuristic source-language detection with confirm-to-continue when the page already matches the target language.
- Short chat memory (`chatHistoryTurns`) included in streamed prompts.
- Optional explain/summarize model separate from the chat model.
- Overlay translation mode that keeps original page text and shows translations in Shadow DOM layers.

## [1.1.0] - 2026-10-07

### Added

- Toolbar badge showing whole-page translation progress while lazy batches run.
- Settings controls to estimate and clear translation, embedding, and chat caches.
- Element Translate / Explain / Summarize preview in the side panel with Apply (translate) and Discard.

## [1.0.0] - 2026-10-07

### Added

- README in English and Persian.
- Packaged zip build via `npm run zip`.
- First stable release after 0.x milestones.

## [0.6.0] - 2026-10-07

### Added

- Lazy whole-page translation with IntersectionObserver and MutationObserver for dynamic content.
- Expanded English/Persian UI strings across popup and side panel with RTL `dir` support.
- Accessibility improvements: dialog/group labels, `aria-busy`, `aria-pressed`, and alert/status regions.

## [0.5.0] - 2026-10-07

### Added

- Embedding-based retrieval for long pages (`/api/embed`, default `bge-m3`) with chunking, cosine ranking, and top-k passages.
- IndexedDB embedding cache keyed by URL + content hash + model.
- Chat history persistence per tab and URL (survives side panel close).
- Shared IndexedDB schema for translations, embeddings, and chat history.

## [0.4.0] - 2026-10-07

### Added

- Side panel chat with streamed Ollama answers, stop button, clear chat, and refresh page content.
- Page text extraction via `@mozilla/readability` (body fallback) with safe truncation for long pages.
- Chat prompts grounded on page content; element context from the picker flows into chat.
- Safe chat text rendering without `innerHTML`.

## [0.3.0] - 2026-10-07

### Added

- Inspect-style element picker with hover highlight overlay, capture-phase click, Esc cancel, Alt+ArrowUp parent selection, and `composedPath()` targeting.
- Shadow DOM action menu: Translate, Explain, Summarize, Ask in chat.
- Toggle picker from popup, `Alt+Shift+L` command, and context menu.
- Side panel stub showing element action results and pending “Ask in chat” context.

## [0.2.0] - 2026-10-07

### Added

- Ollama chat client for non-streaming `/api/chat` with JSON-schema `format`, temperature, `num_ctx`, and `keep_alive`.
- Translation engine with character/item batching, placeholder protection, response length validation, one retry, and per-item fallback.
- IndexedDB translation cache keyed by hash(text + model + target language).
- Content script TreeWalker over text nodes (skipping script/style/code/pre/noscript), whole-page translate, restore original, and RTL `dir` for RTL targets.
- Popup actions: Translate page, Restore original, links to Settings and Help.
- Restricted-page detection for `chrome://`, Web Store, and similar URLs.
- Unit tests for batching, parsing, placeholders, prompts, hashing, and restricted URLs.

## [0.1.0] - 2026-10-07

### Added

- Project scaffold with WXT, React, TypeScript (strict), Tailwind CSS, ESLint, Prettier, and Vitest.
- Settings storage (`chrome.storage.local`) with defaults for Ollama host, models, temperature, `num_ctx`, `keep_alive`, system prompts, target language, and UI language.
- Options page with model selectors (populated from `/api/tags`), editable system prompts with reset-to-default, and a three-way connection diagnosis (CORS / offline / HTTP).
- Help page with Ollama install steps, model pull commands, per-OS `OLLAMA_ORIGINS` commands using the real extension ID, copy button, troubleshooting, and privacy note.
- Open Help on first install via `chrome.runtime.onInstalled`.
- Unit tests for settings normalization, connection classification, RTL detection, and origins command builders.

[1.3.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v1.3.0
[1.2.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v1.2.0
[1.1.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v1.1.0
[1.0.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v1.0.0
[0.6.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.6.0
[0.5.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.5.0
[0.4.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.4.0
[0.3.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.3.0
[0.2.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.2.0
[0.1.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.1.0






