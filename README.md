# LocalLens

Private, offline-first Chrome extension (Manifest V3) that uses a local [Ollama](https://ollama.com) server to translate pages, inspect elements, and chat about page content — all on your machine.

**Persian README:** [README.fa.md](./README.fa.md)

## Features

- **Whole-page translation** — contextual (by meaning), lazy for visible blocks, watches dynamic content
- **Element picker** — Inspect-style selection with Translate / Explain / Summarize / Ask in chat / Read aloud / Translate & read
- **Side panel chat** — streamed answers grounded on the current page (embeddings for long pages); optional voice input and speak-reply
- **Voice** — system TTS for read-aloud; browser speech recognition for chat dictation (see privacy note)
- **Settings & Help** — Ollama host, models, prompts, per-OS `OLLAMA_ORIGINS` setup
- **Privacy** — no cloud APIs, no telemetry, no remote code

## Requirements

- Google Chrome (or Chromium) with Manifest V3 support
- [Ollama](https://ollama.com/download) running locally (default `http://localhost:11434`)
- At least one chat/translate model, e.g. `ollama pull llama3.2`
- For long-page chat: an embedding model, e.g. `ollama pull bge-m3`

## Install (development)

```bash
npm install
npm run dev
```

Load the unpacked extension from `.output/chrome-mv3` if needed, or use the browser window WXT opens.

### Production build / zip

```bash
npm run build
npm run zip
```

- Unpacked build: `.output/chrome-mv3`
- Zip archive: from `npm run zip` under `.output/`

Then Chrome → Extensions → Developer mode → **Load unpacked** → select `.output/chrome-mv3`.

### Firefox (temporary)

```bash
npm run build:firefox
# or: npm run zip:firefox
```

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…**
3. Select `.output/firefox-mv3/manifest.json`

Side panel support depends on Firefox version; use the popup and options if the sidebar UI is unavailable.

## First-time Ollama CORS setup

Chrome extensions call Ollama from a `chrome-extension://` origin. If you see **HTTP 403**, set `OLLAMA_ORIGINS` to include this extension’s ID.

1. Install LocalLens and open **Help** (also opens automatically on first install).
2. Copy the command for your OS (it uses the real extension ID).
3. Restart Ollama completely.
4. Open **Settings** → **Test connection**.

### Quick Windows example

```bat
setx OLLAMA_ORIGINS "chrome-extension://YOUR_EXTENSION_ID"
```

Then quit Ollama from the tray and start it again.

## Usage

1. Configure models in **Settings** (Test connection to list installed models).
2. Open a normal `http(s)` page (not `chrome://` or the Web Store).
3. Use the **popup** to translate the page, restore original text, or start the element picker.
4. Open the **side panel** to chat about the page.
5. Shortcut: **Alt+Shift+L** toggles the element picker (customize at `chrome://extensions/shortcuts`).

## Scripts

| Script               | Description                     |
|----------------------|---------------------------------|
| `npm run dev`        | WXT development mode            |
| `npm run build`      | Production build (Chrome)       |
| `npm run build:firefox` | Production build (Firefox)   |
| `npm run zip`        | Build and package a Chrome zip  |
| `npm run zip:firefox`| Build and package a Firefox zip |
| `npm run icons`      | Regenerate `public/icon/*.png`  |
| `npm run lint`       | ESLint                          |
| `npm run typecheck`  | TypeScript `--noEmit`           |
| `npm run test`       | Vitest unit tests               |

## Architecture (short)

- **Content script** — TreeWalker / picker / Readability extraction; never calls Ollama directly
- **Background service worker** — Ollama client, translation batches, embeddings, chat streaming
- **Extension pages** — popup, options, help, side panel (React + Tailwind)

See [docs/PLAN.md](./docs/PLAN.md) and [docs/DECISIONS.md](./docs/DECISIONS.md).

## Privacy

LocalLens only talks to the Ollama host you configure (default localhost). Page text and chat stay on your device. There is no analytics and no external network dependency beyond that host.

Full policy: [docs/PRIVACY.md](./docs/PRIVACY.md). Store listing checklist: [docs/STORE.md](./docs/STORE.md).

## License

[MIT](./LICENSE) © 2026 Saeed shamsi
