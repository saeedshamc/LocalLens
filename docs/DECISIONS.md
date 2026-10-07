# Technical Decisions

Record of meaningful choices made during development. Newest entries first within each section; dated entries keep chronological history.

---

## 2026-10-07 — Phase 0

### Tooling: WXT over Vite + MV3 plugin

**Decision:** Use [WXT](https://wxt.dev) as the extension framework.

**Why:**

- First-class Manifest V3 support with typed entrypoints (`background`, `content`, `popup`, `options`, side panel).
- Built-in React module, auto-reload, and zip packaging.
- Less boilerplate than hand-wiring Vite + `@crxjs/vite-plugin` for content scripts, HMR, and multi-page HTML entrypoints.
- Active maintenance and TypeScript-first defaults.

**Alternatives considered:** Vite + `@crxjs/vite-plugin`, Plasmo. Rejected for extra wiring cost vs. WXT’s conventions matching this project’s structure.

### UI: React + Tailwind CSS

**Decision:** React for all extension pages (popup, side panel, options, help). Tailwind for styling.

**Why:** Matches the project brief; component reuse across pages; utility CSS keeps styles colocated without a heavy design system.

### Storage: Settings in `chrome.storage.local`; caches in IndexedDB

**Decision:**

- User settings → `chrome.storage.local` (sync not used: hosts/models/prompts can be large; offline-first does not need cross-device sync).
- Translation + embedding caches → IndexedDB (larger payloads, structured indexes).
- Chat history → IndexedDB keyed by tabId + URL (milestone 0.5.0).

**Why:** Sync quota and size limits are a poor fit for prompts and model lists; IndexedDB handles cache volume better.

### Ollama access: Background + extension pages only

**Decision:** Never call Ollama from content scripts.

**Why:** Content scripts on `https` pages hit mixed-content / CORS issues; extension origins still need `OLLAMA_ORIGINS`, but a single client in the service worker keeps diagnosis and retries consistent.

### Connection diagnosis mapping

**Decision:**

| Observation | Kind | User guidance |
|-------------|------|---------------|
| HTTP 403 | `cors` | Set `OLLAMA_ORIGINS` to include `chrome-extension://<id>` (Help page) |
| Network / fetch failure | `offline` | Start Ollama; verify host URL |
| Other HTTP status | `http` | Show status + body snippet; check model/host |

### Versioning

**Decision:** Semantic Versioning starting at `0.1.0`. Keep `package.json` and extension manifest versions identical. Tag each milestone `vX.Y.Z`. CHANGELOG in Keep a Changelog format.

### i18n approach (planned for 0.6.0; stubs earlier)

**Decision:** Custom dictionaries in `lib/i18n` (en / fa) rather than `chrome.i18n` `_locales` alone, so React pages can switch language at runtime from Settings without reloading the whole extension. May still ship `_locales` for manifest strings if needed.

### Safe rendering

**Decision:** Use `textContent` for page DOM writes. Chat markdown rendered with a sanitizing library (chosen in 0.4.0) — never raw `innerHTML` of model or page text.

### Tailwind CSS v4 via Vite plugin

**Decision:** Use Tailwind CSS v4 with `@tailwindcss/vite` wired in `wxt.config.ts`, and a single `assets/tailwind.css` entry imported by UI pages.

**Why:** Matches current Tailwind defaults; avoids maintaining a separate `tailwind.config.js` for this project’s CSS-variable theme.

### TypeScript 5.9 (not 7.x)

**Decision:** Pin `typescript` to `~5.9.3`.

**Why:** `typescript-eslint` peer range requires TypeScript &lt; 6.1 at the time of scaffolding.

---

## 2026-10-07 — Milestone 0.2.0

### Translation batch budgets

**Decision:** Default soft caps of ~1800 characters and 24 items per Ollama request.

**Why:** Keeps service-worker work short under MV3 while still amortizing prompt overhead; oversized single nodes become their own batch.

### Placeholder tokens before translate

**Decision:** Mask URLs, emails, inline `` `code` ``, and numbers as `⟦PHn⟧` before calling the model; restore after parse.

**Why:** Reduces accidental mutation of stable tokens even when the system prompt asks to preserve them.

### Options page opens in a tab

**Decision:** Force `options_ui.open_in_tab = true` via the `build:manifestGenerated` WXT hook.

**Why:** WXT’s default options entry sets `open_in_tab: false`; a full settings form needs a normal tab.

---

## 2026-10-07 — Milestone 0.3.0

### Picker UI in closed Shadow DOM

**Decision:** Render the highlight overlay and action menu inside closed shadow roots attached to `document.documentElement`.

**Why:** Prevents host page CSS from breaking picker chrome; `pointer-events: none` on the highlight keeps hit-testing on the page until click capture handles selection.

### Element action results via side panel + session storage

**Decision:** Store pending ask-context and last element results in `chrome.storage.session`, then open the side panel.

**Why:** Keeps Ollama calls in the background, avoids injecting results into the page DOM, and prepares the side panel for full chat in 0.4.0.

### Default picker shortcut

**Decision:** `Alt+Shift+L` for toggle-picker (`chrome.commands`).

**Why:** Unlikely to collide with common browser shortcuts; remappable at `chrome://extensions/shortcuts`.

---

## 2026-10-07 — Milestone 0.4.0

### Chat streaming over a long-lived port

**Decision:** Side panel connects with `chrome.runtime.connect({ name: 'locallens-chat' })` and receives `CHAT_TOKEN` / `CHAT_DONE` / `CHAT_ERROR` messages; cancel uses `AbortController`.

**Why:** Keeps the MV3 service worker alive for the duration of the stream and supports mid-flight cancellation.

### Long pages in 0.4.0

**Decision:** Truncate extracted page text around 14k characters with an explicit marker; retrieval with embeddings lands in 0.5.0.

**Why:** Delivers working grounded chat immediately without blocking on the embedding pipeline.

### Safe chat rendering

**Decision:** Custom React renderer for newlines, `` `code` ``, and `**bold**` only — no `dangerouslySetInnerHTML`.

**Why:** Meets the no-untrusted-HTML rule with minimal dependency surface.

---

## 2026-10-07 — Milestone 0.5.0

### Long-page threshold and top-k

**Decision:** Pages longer than ~6000 characters use embeddings; return top 6 chunks by cosine similarity to the question.

**Why:** Balances context quality against `num_ctx` and service-worker time; cache avoids re-embedding unchanged pages.

### Unified IndexedDB

**Decision:** Single `locallens` database (v3) with `translations`, `embeddings`, and `chatHistory` stores.

**Why:** Avoids version skew when multiple modules open the same DB name independently.

---

## 2026-10-07 — Milestone 0.6.0

### Lazy translation unit

**Decision:** Observe block-level ancestors (`p`, headings, `li`, …) with IntersectionObserver; MutationObserver ingests newly inserted text.

**Why:** Keeps service-worker batches small on long pages and covers SPA content that appears after the first paint.

---

## 2026-10-07 — Milestone 1.3.0

### Translate over a long-lived port

**Decision:** Content script opens `chrome.runtime.connect({ name: 'locallens-translate' })` for page translation batches.

**Why:** Same rationale as chat streaming — keep the service worker alive across many small Ollama calls on long pages.

### Lazy queue limits

**Decision:** Debounce MutationObserver ingest by 300ms, cap the block queue at 40 (newest kept), and enforce ≥200ms between Ollama batches.

**Why:** Dynamic SPAs otherwise flood Ollama with overlapping requests.

---

*Further decisions will be appended as milestones progress.*
