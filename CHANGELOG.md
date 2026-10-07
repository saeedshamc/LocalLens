# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.5.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.5.0
[0.4.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.4.0
[0.3.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.3.0
[0.2.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.2.0
[0.1.0]: https://github.com/saeedshamc/LocalLens/releases/tag/v0.1.0




