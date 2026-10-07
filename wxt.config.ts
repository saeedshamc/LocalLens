import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  manifest: ({ browser }) => ({
    name: 'LocalLens',
    description:
      'Translate pages and chat about their content using a local Ollama server. Fully offline and private.',
    permissions: [
      'storage',
      'tabs',
      'activeTab',
      'scripting',
      'contextMenus',
      'tts',
      ...(browser === 'firefox' ? [] : (['sidePanel'] as const)),
    ],
    host_permissions: [
      'http://localhost:11434/*',
      'http://127.0.0.1:11434/*',
      'http://*/*',
      'https://*/*',
    ],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    commands: {
      'toggle-picker': {
        suggested_key: {
          default: 'Alt+Shift+L',
          mac: 'Alt+Shift+L',
        },
        description: 'Toggle LocalLens element picker',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'locallens@saeedshamc.github.io',
        strict_min_version: '109.0',
      },
    },
  }),
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }
    },
  },
});
