import {
  applyTranslations,
  collectTranslatableTextNodes,
  restoreOriginals,
  type CollectableTextNode,
} from '../lib/translate/dom';
import type {
  ContentRequest,
  ContentResponse,
  ExtensionResponse,
} from '../lib/messaging/types';
import { createPickerController } from '../lib/picker/controller';
import { isRtlLanguage } from '../lib/utils/rtl';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    let originals: CollectableTextNode[] | null = null;
    let busy = false;
    let translated = false;

    const picker = createPickerController({
      onPick: ({ action, text }) => {
        void chrome.runtime.sendMessage({
          type: 'PICKER_RESULT',
          action,
          text,
          url: location.href,
        });
      },
      onCancel: () => {
        void chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED' });
      },
    });

    chrome.runtime.onMessage.addListener((message: ContentRequest, _sender, sendResponse) => {
      void handle(message).then(sendResponse);
      return true;
    });

    async function handle(message: ContentRequest): Promise<ContentResponse> {
      if (message.type === 'GET_STATUS') {
        return {
          ok: true,
          translated,
          nodeCount: originals?.length ?? 0,
          pickerActive: picker.active,
        };
      }

      if (message.type === 'START_PICKER') {
        picker.start();
        return { ok: true, translated, pickerActive: true };
      }

      if (message.type === 'STOP_PICKER') {
        picker.stop();
        return { ok: true, translated, pickerActive: false };
      }

      if (message.type === 'TOGGLE_PICKER') {
        if (picker.active) picker.stop();
        else picker.start();
        return { ok: true, translated, pickerActive: picker.active };
      }

      if (message.type === 'RESTORE_PAGE') {
        if (originals) restoreOriginals(originals);
        originals = null;
        translated = false;
        return { ok: true, translated: false };
      }

      if (message.type === 'TRANSLATE_PAGE') {
        if (busy) return { ok: false, error: 'Translation already in progress.', kind: 'busy' };

        busy = true;
        try {
          if (translated && originals) {
            restoreOriginals(originals);
            originals = null;
            translated = false;
          }

          const nodes = collectTranslatableTextNodes();
          if (nodes.length === 0) {
            return {
              ok: false,
              error: 'No translatable text found on this page.',
              kind: 'empty',
            };
          }

          const settingsRes = (await chrome.runtime.sendMessage({
            type: 'GET_SETTINGS',
          })) as ExtensionResponse;

          if (!settingsRes.ok || !('settings' in settingsRes)) {
            return {
              ok: false,
              error: !settingsRes.ok ? settingsRes.error : 'Failed to load settings.',
              kind: 'error',
            };
          }

          const settings = settingsRes.settings;
          if (!settings.translateModel) {
            return {
              ok: false,
              error: 'No translate model selected. Open Settings and choose a model.',
              kind: 'error',
            };
          }

          const texts = nodes.map((n) => n.text);
          const batchRes = (await chrome.runtime.sendMessage({
            type: 'TRANSLATE_BATCH',
            texts,
          })) as ExtensionResponse;

          if (!batchRes.ok || !('translations' in batchRes)) {
            return {
              ok: false,
              error: !batchRes.ok ? batchRes.error : 'Translation failed.',
              kind: 'error',
            };
          }

          originals = nodes;
          applyTranslations(
            nodes,
            batchRes.translations,
            isRtlLanguage(settings.targetLanguage),
          );
          translated = true;

          return {
            ok: true,
            translated: true,
            nodeCount: nodes.length,
            fromCache: batchRes.fromCache,
            fromModel: batchRes.fromModel,
          };
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : 'Unexpected translation error.';
          return { ok: false, error: msg, kind: 'error' };
        } finally {
          busy = false;
        }
      }

      return { ok: false, error: 'Unknown content request.', kind: 'error' };
    }
  },
});
