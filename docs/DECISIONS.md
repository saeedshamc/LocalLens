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

---

*Further decisions will be appended as milestones progress.*
