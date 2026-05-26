/**
 * Gemini Proxy Client (secure)
 * All AI calls now go through our Cloudflare Worker.
 * The real GEMINI_API_KEY lives only in the Worker's secrets.
 *
 * HARDENED:
 * - Throws loudly in production if VITE_GEMINI_PROXY_URL is missing
 * - 120s timeout on proxy requests
 */

export interface GeminiTransformRequest {
  mode: 'transform' | 'metadata';
  action?: string;
  customInstruction?: string;
  fileName: string;
  content: string;
}

const RAW_PROXY = (import.meta as any).env?.VITE_GEMINI_PROXY_URL;

if (!RAW_PROXY && import.meta.env.PROD) {
  throw new Error('VITE_GEMINI_PROXY_URL is required in production. See .env.example and worker deployment docs.');
}

const PROXY_URL = RAW_PROXY || 'http://localhost:8787';

async function callProxy<T>(body: GeminiTransformRequest): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(`${PROXY_URL}/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini proxy error ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runAiTransformation(
  file: File,
  extractedMarkdown: string,
  action: string,
  customInstruction?: string
): Promise<string> {
  return callProxy<string>({
    mode: 'transform',
    action,
    customInstruction,
    fileName: file.name,
    content: extractedMarkdown,
  });
}

export async function extractDocumentMetadata(content: string, fileName: string) {
  return callProxy<any>({
    mode: 'metadata',
    fileName,
    content,
  });
}
