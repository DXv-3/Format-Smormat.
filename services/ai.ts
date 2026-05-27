interface GeminiTransformRequest {
  mode: 'transform' | 'metadata' | 'lens_render' | 'ir_enrich';
  action?: string;
  customInstruction?: string;
  lensId?: string;
  nodeData?: string;
  fileName?: string;
  content: string;
}

const PROXY_URL = (import.meta as any).env?.PROD ? (import.meta as any).env?.VITE_WORKER_URL || '/api' : '/api';

export async function callWorker<T>(body: GeminiTransformRequest): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Worker proxy error ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(t);
  }
}

export async function runAiTransformation(file: File, extractedMarkdown: string, action: string, customInstruction?: string) {
  const result = await callWorker<{ text: string }>({
    mode: 'transform',
    action,
    customInstruction,
    fileName: file.name,
    content: extractedMarkdown
  });
  return result.text || "";
}

export async function extractDocumentMetadata(content: string, fileName: string) {
  const responseText = await callWorker<{ text: string }>({
    mode: 'metadata',
    fileName,
    content
  });

  if (responseText.text) {
    try {
      let text = responseText.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (text.startsWith('```')) {
        text = text.replace(/^```/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return null;
    }
  }
  return null;
}
