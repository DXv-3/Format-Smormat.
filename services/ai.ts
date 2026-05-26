/**
 * Gemini Proxy Client (secure)
 * All AI calls now go through our Cloudflare Worker.
 * The real GEMINI_API_KEY lives only in the Worker's secrets.
 */

export interface GeminiTransformRequest {
  mode: 'transform' | 'metadata';
  action?: string;
  customInstruction?: string;
  fileName: string;
  content: string; // markdown or raw extracted text
}

const PROXY_URL = (import.meta as any).env?.VITE_GEMINI_PROXY_URL || 'http://localhost:8787';

async function callProxy<T>(body: GeminiTransformRequest): Promise<T> {
  const res = await fetch(`${PROXY_URL}/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini proxy error ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
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
