export interface OllamaModelTag {
  name: string;
  model?: string;
  size?: number;
  modified_at?: string;
}

export interface OllamaTagsResponse {
  models: OllamaModelTag[];
}

export type ConnectionResult =
  | { ok: true; models: string[] }
  | { ok: false; kind: 'cors'; message: string }
  | { ok: false; kind: 'offline'; message: string }
  | { ok: false; kind: 'http'; status: number; message: string };
