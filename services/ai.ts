interface GeminiTransformRequest {
  mode: 'transform' | 'metadata';
  action?: string;
  customInstruction?: string;
  fileName: string;
  content: string;
}

const RAW_PROXY = (import.meta as any).env?.VITE_GEMINI_PROXY_URL;
if (!RAW_PROXY && (import.meta as any).env?.PROD) {
  throw new Error('VITE_GEMINI_PROXY_URL is required in production.');
}
const PROXY_URL = RAW_PROXY || 'http://localhost:8787';

async function callProxy<T>(body: GeminiTransformRequest): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${PROXY_URL}/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini proxy error ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(t);
  }
}

export async function runAiTransformation(file: File, extractedMarkdown: string, action: string, customInstruction?: string) {
  const result = await callProxy<{ text: string }>({
    mode: 'transform',
    action,
    customInstruction,
    fileName: file.name,
    content: extractedMarkdown
  });
  return result.text || "";
}

export async function extractDocumentMetadata(content: string, fileName: string) {
  const responseText = await callProxy<{ text: string }>({
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
