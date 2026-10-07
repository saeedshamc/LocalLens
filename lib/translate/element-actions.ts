import { ollamaChat, OllamaClientError } from '../ollama/client';
import type { Settings } from '../settings/types';
import { translateBatch } from './engine';

export type ElementActionKind =
  | 'translate'
  | 'explain'
  | 'summarize'
  | 'read'
  | 'translateRead';

function actionSystemPrompt(
  kind: Exclude<ElementActionKind, 'read' | 'translate' | 'translateRead'>,
  settings: Settings,
): string {
  if (kind === 'explain') {
    return `Explain the selected page content clearly in the user's preferred language (${settings.targetLanguage}). Be concise. Do not invent facts beyond the provided text.`;
  }
  return `Summarize the selected page content in ${settings.targetLanguage}. Keep it short and faithful to the source.`;
}

export async function runElementAction(
  kind: ElementActionKind,
  text: string,
  settings: Settings,
  signal?: AbortSignal,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new OllamaClientError('parse', 'The selected element has no text content.');
  }

  if (kind === 'read') {
    return trimmed;
  }

  if (kind === 'translate' || kind === 'translateRead') {
    const result = await translateBatch({ texts: [trimmed], settings, signal });
    return result.translations[0] ?? trimmed;
  }

  const model =
    settings.explainModel || settings.chatModel || settings.translateModel;
  if (!model) {
    throw new OllamaClientError(
      'http',
      'No explain/chat/translate model selected. Open Settings and choose a model.',
    );
  }

  const response = await ollamaChat({
    host: settings.ollamaHost,
    model,
    messages: [
      { role: 'system', content: actionSystemPrompt(kind, settings) },
      {
        role: 'user',
        content: `Selected content:\n\n${trimmed.slice(0, 12000)}`,
      },
    ],
    stream: false,
    options: {
      temperature: Math.max(settings.temperature, 0.2),
      num_ctx: settings.numCtx,
    },
    keep_alive: settings.keepAlive,
    signal,
  });

  return response.message.content.trim();
}
