// ============================================================
// FORMAT-SMORMAT — AI SERVICE BRIDGE
// Thin wrapper over the Worker API. Zero keys. Always /api.
// Legacy surface kept for IngestionEngine / FileItem compat.
// ============================================================
import type { WorkerRequest, WorkerResponse } from '../types';

const WORKER_URL: string =
  (import.meta as any).env?.VITE_WORKER_URL ??
  ((import.meta as any).env?.PROD
    ? (() => { throw new Error('VITE_WORKER_URL is required in production.'); })()
    : '/api');

const DEFAULT_TIMEOUT_MS = 120_000;

async function callWorker(body: WorkerRequest): Promise<WorkerResponse> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Worker error ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<WorkerResponse>;
  } finally {
    clearTimeout(t);
  }
}

/** Legacy: used by IngestionEngine + FileItem for full AI transforms */
export async function runAiTransformation(
  file: File,
  extractedMarkdown: string,
  action: string,
  customInstruction?: string
): Promise<string> {
  const res = await callWorker({
    mode: 'transform',
    action: action as any,
    customInstruction,
    fileName: file.name,
    content: extractedMarkdown,
  });
  return res.text ?? '';
}

/** Legacy: used by App.tsx handleAnalyzeFile */
export async function extractDocumentMetadata(
  content: string,
  fileName: string
): Promise<Record<string, unknown> | null> {
  const res = await callWorker({ mode: 'metadata', fileName, content });
  if (!res.text) return null;
  try {
    let text = res.text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}
