# LocalLens — Project Plan

## Goals

LocalLens is a private, offline-first Chrome extension (Manifest V3) that uses a locally running Ollama server to:

1. Translate a whole web page contextually (by meaning, not word-for-word).
2. Let the user pick any page element (Inspect-style) and translate / explain / summarize it, or ask about it in chat.
3. Provide a Side Panel chat where the user can ask questions about the current page, with streamed answers.
4. Ship Settings and Help pages inside the extension, including per-OS Ollama setup instructions.

Constraints:

- No cloud services, API keys, telemetry, or remote code.
- Works with no internet as long as Ollama is running locally.
- Minimal permissions; only localhost (and 127.0.0.1) for Ollama, plus content-script needs.
- Never inject untrusted page text via `innerHTML`.

## Architecture Overview

```
┌─────────────────┐     messages/ports      ┌──────────────────────────┐
│ Content Script  │ ◄─────────────────────► │ Background Service Worker │
│ - TreeWalker    │                         │ - Ollama HTTP client      │
│ - Picker/overlay│                         │ - Translation orchestration│
│ - MutationObs   │                         │ - Embedding + retrieval   │
│ - Readability   │                         │ - Settings + cache proxy  │
└─────────────────┘                         └────────────┬─────────────┘
                                                         │
        ┌────────────────┬────────────────┬──────────────┼──────────────┐
        ▼                ▼                ▼              ▼              ▼
   Side Panel UI    Popup UI        Options Page    Help Page    IndexedDB
   (chat stream)    (actions)       (settings)      (setup)      (caches)
```

**Key rules**

- All Ollama requests originate from the background service worker or extension pages (side panel / options). Content scripts never call Ollama directly (avoids mixed-content / CORS on `https` pages).
- Long-running work uses long-lived ports so MV3 does not kill mid-request.
- Translation batches stay small enough for service-worker lifetime; chat streaming uses `AbortController` + port.

## Folder Structure

```
LocalLens/
├── docs/
│   ├── PLAN.md
│   └── DECISIONS.md
├── entrypoints/
│   ├── background.ts
│   ├── content.ts
│   ├── popup/
│   ├── sidepanel/
│   ├── options/
│   └── help/
├── components/          # Shared React UI
├── lib/
│   ├── ollama/          # Client, connection diagnosis, streaming
│   ├── translate/       # Batching, prompts, schema, cache keys
│   ├── retrieve/        # Chunking, embeddings, cosine similarity
│   ├── extract/         # Readability wrapper, text-node helpers
│   ├── storage/         # Settings, IndexedDB caches, chat history
│   ├── messaging/       # Typed message/port contracts
│   ├── i18n/            # en / fa dictionaries + helpers
│   └── utils/           # Hashing, RTL detection, sanitization
├── public/              # Icons, static assets
├── tests/               # Vitest unit tests for pure logic
├── package.json
├── wxt.config.ts
├── tsconfig.json
├── CHANGELOG.md
└── README.md / README.fa.md
```

Exact layout may follow WXT conventions (`entrypoints/`, `components/`, `lib/`, `assets/`).

## Message-Passing Contract

All messages are typed unions. Content ↔ background uses `chrome.runtime.sendMessage` for short RPCs and `chrome.runtime.connect` ports for streaming / long work.

### Content → Background

| Type | Payload | Response |
|------|---------|----------|
| `TRANSLATE_BATCH` | `{ texts: string[]; targetLang: string }` | `{ translations: string[] }` or error |
| `TRANSLATE_ELEMENT` | `{ text: string; targetLang: string }` | `{ translation: string }` or error |
| `RESTORE_PAGE` | — | `{ ok: true }` (content applies locally; may be no-op ack) |
| `GET_SETTINGS` | — | `Settings` |
| `PICKER_STATE` | `{ active: boolean }` | ack |
| `EXTRACT_PAGE_TEXT` | — | handled in content; result sent back as `PAGE_TEXT` |
| `ASK_ABOUT_ELEMENT` | `{ text: string; url: string }` | forwarded to side panel |
| `CONNECTION_TEST` | — | `ConnectionResult` |

### Side Panel → Background

| Type | Payload | Response / Stream |
|------|---------|-------------------|
| `CHAT_START` | `{ question: string; tabId: number; url: string; pageText?: string; elementContext?: string }` | port stream: `CHAT_TOKEN`, `CHAT_DONE`, `CHAT_ERROR` |
| `CHAT_CANCEL` | `{ requestId: string }` | ack |
| `REFRESH_PAGE_CONTENT` | `{ tabId: number }` | `{ text: string; truncated: boolean }` |
| `CLEAR_CHAT` | `{ tabId: number; url: string }` | ack |
| `GET_CHAT_HISTORY` | `{ tabId: number; url: string }` | `{ messages: ChatMessage[] }` |

### Background → Content

| Type | Payload |
|------|---------|
| `START_PICKER` | — |
| `STOP_PICKER` | — |
| `APPLY_TRANSLATIONS` | `{ nodeIds: string[]; translations: string[]; rtl: boolean }` |
| `RESTORE_ORIGINALS` | — |
| `GET_PAGE_TEXT` | — |
| `HIGHLIGHT_NODES` | optional diagnostics |

### Background → Side Panel

| Type | Payload |
|------|---------|
| `ELEMENT_CONTEXT` | `{ text: string; url: string }` |
| `CHAT_TOKEN` / `CHAT_DONE` / `CHAT_ERROR` | streaming chunks |

Restricted pages (`chrome://`, Chrome Web Store, `chrome-extension://`) return a clear error; content script is not injected there.

## Data Models

### Settings (`chrome.storage.sync` or `local`)

```ts
interface Settings {
  ollamaHost: string;           // default http://localhost:11434
  translateModel: string;
  chatModel: string;
  embeddingModel: string;       // default bge-m3
  targetLanguage: string;       // e.g. "fa", "en"
  temperature: number;          // default ~0.2 for translate, configurable
  numCtx: number;
  keepAlive: string;            // e.g. "5m"
  systemPromptTranslate: string;
  systemPromptChat: string;
  uiLanguage: "en" | "fa";
}
```

Defaults are defined in code; Options page supports reset-to-default for system prompts.

### Translation Cache (IndexedDB)

```ts
interface TranslationCacheEntry {
  key: string;          // hash(text + model + targetLang)
  text: string;
  translation: string;
  model: string;
  targetLang: string;
  createdAt: number;
}
```

### Embedding Cache (IndexedDB)

```ts
interface EmbeddingCacheEntry {
  key: string;          // hash(url + contentHash + model)
  url: string;
  contentHash: string;
  model: string;
  chunks: { text: string; embedding: number[] }[];
  createdAt: number;
}
```

### Chat History (IndexedDB or `chrome.storage.local`)

```ts
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

interface ChatThread {
  tabId: number;
  url: string;
  messages: ChatMessage[];
  updatedAt: number;
}
```

Keyed per tab + URL. Clearing chat removes the thread.

### Connection Result

```ts
type ConnectionStatus =
  | { ok: true; models: string[] }
  | { ok: false; kind: "cors"; message: string }      // HTTP 403
  | { ok: false; kind: "offline"; message: string }   // network error
  | { ok: false; kind: "http"; status: number; message: string };
```

## Milestones

### 0.1.0 — Scaffold & Settings

- WXT + React + Tailwind + TypeScript strict
- ESLint, Prettier, Vitest, scripts: `lint`, `typecheck`, `test`, `build`
- Settings storage + defaults
- Options page: host, models (from `/api/tags`), target language, temperature, num_ctx, keep_alive, system prompts, UI language, Test connection
- Help page: install Ollama, pull models, `OLLAMA_ORIGINS` per OS with real extension ID + copy button, feature guide stub, troubleshooting, privacy
- `chrome.runtime.onInstalled` opens Help on first install
- CHANGELOG started

**Done when:** Extension loads in Chrome, Options/Help work, connection test distinguishes cors / offline / http / ok, version synced in package.json + manifest.

### 0.2.0 — Translation Engine

- Ollama client (`/api/tags`, `/api/chat` non-stream with JSON schema format)
- Batching by character length, JSON-schema response, length validation, one retry, per-item fallback
- IndexedDB translation cache
- Popup: Translate page / Restore
- Content: TreeWalker over text nodes (skip script/style/code/pre/noscript), preserve inline structure, mark translated nodes, `dir="rtl"` for RTL targets
- Restricted-page handling

**Done when:** Whole-page translate + restore works on a normal https page with Ollama running; cache hits skip re-translation; unit tests for chunking/placeholder/prompts/parsing.

### 0.3.0 — Element Picker

- Toggle from popup, `chrome.commands` shortcut, context menu
- Hover highlight overlay (`pointer-events: none`), capture-phase click, Esc cancel, Alt+ArrowUp parent, `composedPath()` for shadow DOM
- Shadow DOM action menu: Translate, Explain, Summarize, Ask in chat
- Element-level translate/explain/summarize via background

**Done when:** Picker selects nested/shadow elements safely; menu actions work; page links do not navigate on pick.

### 0.4.0 — Side Panel Chat

- Side panel with streamed NDJSON answers, stop button
- `@mozilla/readability` page extraction
- Short pages: full text in context; system prompt grounded on page content
- Ask-about-element wires picker → side panel context
- Refresh page content / clear chat (in-memory for this milestone if persistence lands in 0.5.0)

**Done when:** Chat streams tokens, cancel works, answers refuse off-page questions clearly, element context appears in chat.

### 0.5.0 — Retrieval & History

- Chunk text, `/api/embed` (default `bge-m3`), cosine rank, top-k
- Embedding cache keyed by URL + content hash + model
- Chat history persistence per tab/URL
- Expose embedding model in settings (if not already)

**Done when:** Long pages retrieve relevant chunks only; history survives panel close; unit tests for cosine similarity and chunking.

### 0.6.0 — Polish

- Lazy translation via IntersectionObserver
- MutationObserver for dynamic content
- Full i18n en/fa + RTL polish across UI
- Accessibility (focus, labels, keyboard)
- Unified actionable error states

**Done when:** Dynamic SPAs get newly inserted text translated when visible; UI fully bilingual and accessible; no known crash on restricted pages.

### 1.0.0 — Release

- README.md (English) and README.fa.md (Persian)
- LICENSE already MIT — verify copyright year/holder
- Final QA checklist
- Packaged zip build script
- Tag `v1.0.0`

**Done when:** Clean install from zip works offline with Ollama; docs complete; all scripts pass.

## Risks

| Risk | Mitigation |
|------|------------|
| Ollama CORS (`OLLAMA_ORIGINS`) blocks extension | Detect 403; Help page generates exact `setx` / systemd / launchctl command with `chrome.runtime.id` |
| MV3 service worker killed mid-request | Small batches; long-lived ports for chat/stream |
| Huge pages overwhelm context | Embeddings + top-k retrieval; batch translation |
| Site CSS breaks overlays/menus | Shadow DOM for picker UI; overlay `pointer-events: none` |
| Restricted pages (chrome://, Web Store) | Detect and show actionable message; no inject |
| Model JSON schema non-compliance | Validate length; retry once; per-item fallback |
| Embedding model not pulled | Connection/settings UX lists installed models; clear error if missing |
| Persian RTL layout regressions | Test both UI languages; `dir` on translated nodes and UI roots |

## Definition of Done (global)

- Version identical in `package.json` and extension manifest
- CHANGELOG updated (Keep a Changelog)
- `npm run lint`, `typecheck`, `test`, `build` pass
- Annotated git tag `vX.Y.Z` at milestone end
- User-visible, actionable errors for every failure path listed in the quality bar
- No remote network except configured Ollama host
- Commits follow Conventional Commits; no AI/tool attribution anywhere
