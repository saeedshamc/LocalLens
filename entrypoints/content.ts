import { extractPageText } from '../lib/extract/page-text';
import { pickerActionLabels, t } from '../lib/i18n';
import type {
  ContentRequest,
  ContentResponse,
  ExtensionResponse,
} from '../lib/messaging/types';
import { createPickerController } from '../lib/picker/controller';
import { showPageToast } from '../lib/picker/toast';
import { resolveTranslateModel } from '../lib/settings/models';
import type { Settings } from '../lib/settings/types';
import { applyElementTranslation } from '../lib/translate/apply-element';
import { createLazyTranslator, type LazyTranslateController } from '../lib/translate/lazy';
import { createTranslatePortClient } from '../lib/translate/port-client';
import { looksLikeTargetLanguage } from '../lib/utils/detect-lang';
import { isRtlLanguage } from '../lib/utils/rtl';

const CONTENT_BOOT_FLAG = '__locallensContentBooted';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  main() {
    const boot = globalThis as typeof globalThis & {
      [CONTENT_BOOT_FLAG]?: boolean;
    };
    if (boot[CONTENT_BOOT_FLAG]) return;
    boot[CONTENT_BOOT_FLAG] = true;

    let lazy: LazyTranslateController | null = null;
    let translatePort: ReturnType<typeof createTranslatePortClient> | null = null;
    let translated = false;
    let busy = false;
    let cachedSettings: Settings | null = null;

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
      getActionLabels: () =>
        pickerActionLabels(cachedSettings?.uiLanguage ?? 'en'),
      getDir: () =>
        isRtlLanguage(cachedSettings?.uiLanguage ?? 'en') ? 'rtl' : 'ltr',
    });

    chrome.runtime.onMessage.addListener((message: ContentRequest, _sender, sendResponse) => {
      void handle(message).then(sendResponse);
      return true;
    });

    async function ensureSettings() {
      const settingsRes = (await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS',
      })) as ExtensionResponse;
      if (!settingsRes.ok || !('settings' in settingsRes)) {
        throw new Error(
          !settingsRes.ok
            ? settingsRes.error
            : t(cachedSettings?.uiLanguage ?? 'en', 'errorSettingsLoad'),
        );
      }
      cachedSettings = settingsRes.settings;
      return settingsRes.settings;
    }

    function uiLang() {
      return cachedSettings?.uiLanguage ?? 'en';
    }

    async function handle(message: ContentRequest): Promise<ContentResponse> {
      if (message.type === 'GET_STATUS') {
        return {
          ok: true,
          kind: 'status',
          translated,
          nodeCount: lazy?.getOriginals().length ?? 0,
          pickerActive: picker.active,
        };
      }

      if (message.type === 'START_PICKER') {
        await ensureSettings().catch(() => null);
        picker.start();
        return { ok: true, kind: 'status', translated, pickerActive: true };
      }

      if (message.type === 'STOP_PICKER') {
        picker.stop();
        return { ok: true, kind: 'status', translated, pickerActive: false };
      }

      if (message.type === 'TOGGLE_PICKER') {
        if (picker.active) picker.stop();
        else {
          await ensureSettings().catch(() => null);
          picker.start();
        }
        return {
          ok: true,
          kind: 'status',
          translated,
          pickerActive: picker.active,
        };
      }

      if (message.type === 'EXTRACT_PAGE_TEXT') {
        await ensureSettings().catch(() => null);
        const extracted = extractPageText(document, 250_000);
        if (!extracted.text.trim()) {
          return {
            ok: false,
            error: t(uiLang(), 'errorNoPageText'),
            kind: 'empty',
          };
        }
        return {
          ok: true,
          kind: 'pageText',
          pageText: {
            title: extracted.title,
            text: extracted.text,
            truncated: extracted.truncated,
            source: extracted.source,
            url: location.href,
          },
        };
      }

      if (message.type === 'SHOW_TOAST') {
        showPageToast(message.message, message.tone ?? 'info');
        return { ok: true, kind: 'status', translated };
      }

      if (message.type === 'APPLY_ELEMENT_TRANSLATION') {
        const ok = applyElementTranslation(
          document.body,
          message.originalText,
          message.translation,
        );
        if (!ok) {
          await ensureSettings().catch(() => null);
          return {
            ok: false,
            error: t(uiLang(), 'errorApplyNotFound'),
            kind: 'error',
          };
        }
        return { ok: true, kind: 'status', translated };
      }

      if (message.type === 'RESTORE_PAGE') {
        lazy?.stop();
        lazy?.restore();
        lazy = null;
        translatePort?.disconnect();
        translatePort = null;
        translated = false;
        busy = false;
        void chrome.runtime.sendMessage({
          type: 'TRANSLATE_PROGRESS',
          done: 0,
          pending: 0,
        });
        return { ok: true, kind: 'status', translated: false };
      }

      if (message.type === 'TRANSLATE_PAGE') {
        if (busy) {
          await ensureSettings().catch(() => null);
          return {
            ok: false,
            error: t(uiLang(), 'errorTranslateBusy'),
            kind: 'busy',
          };
        }

        busy = true;
        try {
          lazy?.stop();
          lazy?.restore();
          lazy = null;
          translatePort?.disconnect();
          translatePort = null;
          translated = false;

          const settings = await ensureSettings();
          if (!resolveTranslateModel(settings)) {
            return {
              ok: false,
              error: t(uiLang(), 'errorNoTranslateModel'),
              kind: 'error',
            };
          }

          const sample = (document.body?.innerText ?? '').slice(0, 4000);
          if (
            !message.force &&
            looksLikeTargetLanguage(sample, settings.targetLanguage)
          ) {
            return {
              ok: false,
              error: t(uiLang(), 'sameLanguageWarn'),
              kind: 'sameLanguage',
            };
          }

          const rtl = isRtlLanguage(settings.targetLanguage);
          translatePort = createTranslatePortClient();
          lazy = createLazyTranslator({
            rtl,
            mode: settings.translationMode,
            translateBatch: (texts) => translatePort!.translateBatch(texts),
            onProgress: ({ done, pending }) => {
              void chrome.runtime.sendMessage({
                type: 'TRANSLATE_PROGRESS',
                done,
                pending,
              });
            },
            onError: (error) => {
              void chrome.runtime.sendMessage({
                type: 'TRANSLATE_PROGRESS',
                done: lazy?.translatedCount ?? 0,
                pending: 0,
              });
              showPageToast(
                error.message || t(uiLang(), 'errorTranslationFailed'),
                'error',
              );
            },
          });
          lazy.start();
          translated = true;

          // Wait so visible blocks enqueue and the first batch can start.
          await new Promise((r) => setTimeout(r, 250));

          void chrome.runtime.sendMessage({
            type: 'TRANSLATE_PROGRESS',
            done: lazy.translatedCount,
            pending: lazy.pendingCount,
          });

          if (lazy.pendingCount === 0 && lazy.translatedCount === 0) {
            lazy.stop();
            lazy = null;
            translatePort?.disconnect();
            translatePort = null;
            translated = false;
            return {
              ok: false,
              error: t(uiLang(), 'errorNoPageText'),
              kind: 'empty',
            };
          }

          return {
            ok: true,
            kind: 'status',
            translated: true,
            nodeCount: lazy.translatedCount,
          };
        } catch (error) {
          lazy?.stop();
          lazy = null;
          translatePort?.disconnect();
          translatePort = null;
          translated = false;
          void chrome.runtime.sendMessage({
            type: 'TRANSLATE_PROGRESS',
            done: 0,
            pending: 0,
          });
          const msg =
            error instanceof Error
              ? error.message
              : t(uiLang(), 'errorUnexpectedTranslate');
          return { ok: false, error: msg, kind: 'error' };
        } finally {
          busy = false;
        }
      }

      await ensureSettings().catch(() => null);
      return { ok: false, error: t(uiLang(), 'errorUnknownRequest'), kind: 'error' };
    }
  },
});
