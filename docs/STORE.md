# Chrome Web Store / AMO listing checklist

Use this when submitting LocalLens. Do **not** claim cloud AI features; emphasize offline / local Ollama.

## Short description (≤132 characters)

Private offline page translation and chat via your local Ollama — no cloud API keys.

## Detailed description (draft)

LocalLens is a Manifest V3 extension that keeps page translation and Q&A on your machine.

**Features**

- Contextual whole-page translation (lazy + dynamic content)
- Inspect-style element picker: translate, explain, summarize, ask in chat
- Side panel chat grounded on the current page (embeddings for long pages)
- English and Persian UI with RTL support
- Works offline as long as Ollama is running locally

**Setup**

1. Install [Ollama](https://ollama.com) and pull models (e.g. `llama3.2`, `bge-m3`).
2. Set `OLLAMA_ORIGINS` to allow this extension (Help page shows the exact command).
3. Open Settings → Test connection → choose models.

**Privacy**

LocalLens does not use cloud LLM APIs or analytics. See `docs/PRIVACY.md`.

## Category

Productivity / Tools

## Screenshots to capture

1. Options — connection test success
2. Popup — translate / picker actions
3. Page mid-translation with badge progress
4. Side panel chat answering from page content
5. Help — OLLAMA_ORIGINS command with copy button

Recommended size: 1280×800 or store-required dimensions.

## Privacy practices (Chrome Web Store form)

- Single purpose: local translation and page Q&A via user-hosted Ollama
- Data used in the extension only; not sold; not used for ads
- Host permission limited to configured localhost Ollama endpoints (+ content scripts on http/https pages)
- Link privacy policy: repository `docs/PRIVACY.md` (or hosted copy)

## Firefox (AMO)

- Build with `npm run build:firefox` / `npm run zip:firefox`
- Temporary install: `about:debugging` → This Firefox → Load Temporary Add-on → select `manifest.json` under `.output/firefox-mv3`
- Ensure `browser_specific_settings.gecko.id` is set before formal AMO submission

## Assets

- Icons: `public/icon/{16,32,48,128}.png` (regenerate with `node scripts/generate-icons.mjs`)
- Zip: `npm run zip` → `.output/locallens-*-chrome.zip`
