# Privacy Policy — LocalLens

**Last updated:** 2026-10-07

LocalLens is a browser extension that helps you translate web pages and ask questions about page content using a **locally running Ollama server** on your machine (or another host you configure).

## What data is processed

- **Page text** selected for translation or chat (including text extracted for context).
- **Chat messages** you type or dictate in the side panel.
- **Settings** you configure (Ollama host URL, model names, prompts, UI language, voice options, etc.).
- **Caches** of translations, embeddings, and chat history stored **only on your device** (IndexedDB / `chrome.storage`).
- **Optional voice input (STT):** if you use Voice input, the browser’s Speech Recognition API processes microphone audio. In Google Chrome this commonly means audio is sent to Google’s recognition service — LocalLens does not control that path. Prefer typing for fully offline input.
- **Read aloud (TTS):** uses the browser/OS text-to-speech engine (`chrome.tts` / system voices) on your device; LocalLens does not upload spoken audio for TTS.

## Where data goes

- By default, LLM and embedding requests are sent only to `http://localhost:11434` (or the Ollama host URL you set in Settings).
- LocalLens does **not** send page content, chat, or settings to LocalLens servers, analytics providers, or other third-party cloud LLM APIs.
- Voice typing may involve the browser vendor’s speech service (see above).
- There is **no telemetry**, crash reporting, or advertising SDK in the extension.

## What we do not collect

- Account credentials for LocalLens (there is no LocalLens account).
- Browsing history beyond what you choose to process while using the extension.
- Remote analytics identifiers.

## Permissions

LocalLens requests only the permissions needed to:

- Store settings and caches (`storage`)
- Talk to the active tab and inject the content script on normal `http(s)` pages (`tabs` / `activeTab` / `scripting` / content scripts)
- Access normal web pages (`http://*/*`, `https://*/*`) so translation can attach after extension reload without requiring a manual tab refresh every time
- Provide a context menu and side panel (`contextMenus`, `sidePanel`)
- Speak text with system voices (`tts`)
- Reach the configured Ollama host on localhost / 127.0.0.1 (host permissions)
- Microphone access is requested by the browser only if you use Voice input

## Your controls

- Clear translation, embedding, and chat caches from **Settings**.
- Change or reset the Ollama host and models at any time.
- Uninstall the extension to remove its local storage (browser-dependent).

## Contact

For privacy questions about this open-source project, open an issue on the GitHub repository: https://github.com/saeedshamc/LocalLens
