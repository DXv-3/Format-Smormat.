/**
 * Cloudflare Worker – Secure Gemini Proxy for Format-Smormat
 *
 * This is the ONLY place the real GEMINI_API_KEY ever lives.
 * The SPA never sees it.
 *
 * HARDENED v1:
 * - CORS restricted to ALLOWED_ORIGINS (env, comma-separated)
 * - Simple per-IP rate limiter (30 req / 60s window)
 * - Early 413 on payloads > 2 MB
 * - Safer error responses (never leak key or raw stack in prod path)
 *
 * Deploy:
 *   cd worker
 *   wrangler login
 *   wrangler secret put GEMINI_API_KEY   # paste your real key here
 *   wrangler secret put ALLOWED_ORIGINS "https://your-spa-domain.com,http://localhost:3000"
 *   wrangler deploy
 *
 * Then set VITE_GEMINI_PROXY_URL to the returned *.workers.dev URL.
 */

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS?: string;
}

interface ProxyRequest {
  mode: 'transform' | 'metadata';
  action?: string;
  customInstruction?: string;
  fileName: string;
  content: string;
}

const GEMINI_REST = 'https://generativelanguage.googleapis.com/v1beta';

// Hardened CORS + rate limiting
const ALLOWED_ORIGINS_DEFAULT = ['http://localhost:3000', 'http://localhost:8787'];

function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || ALLOWED_ORIGINS_DEFAULT.join(',');
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Very simple in-memory rate limiter (resets on Worker restart – sufficient for v1)
const rateMap = new Map<string, { count: number; reset: number }>(); 
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + WINDOW_MS };
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

function buildTransformPrompt(req: ProxyRequest): string {
  const { action = 'markdown_raw', customInstruction, fileName, content } = req;

  let prompt = '';

  if (action === 'ai_second_brain') {
    prompt = `You are an expert Personal Knowledge Management (PKM) assistant. Organize the following document into a pristine markdown file tailored for an Obsidian/Notion "Second Brain".
    
Required Format:
1. Start with a YAML frontmatter block containing:
   - title
   - date
   - tags (array)
   - aliases (array)
   - source_type
2. A brief 1-paragraph summary under an "## Abstract" header.
3. A list of 5-10 key bidirectional links (formatted as [[Topic Name]]) under "## Core Concepts".
4. The remaining document meticulously formatted with proper Markdown headers (H2/H3), bullet points, and bolded entities for high scannability. 

CRITICAL: Do NOT simply abbreviate or truncate the content. You must process and synthesize the ENTIRE document comprehensively.`;
  } else if (action === 'ai_insights_deep') {
    prompt = `You are a world-class strategic analyst. Analyze the following document aggressively through the specific lens or persona provided below.

Your Lens/Focus/Persona:
"${customInstruction || 'General strategic analysis'}"

Instructions:
1. Get your hands dirty. Dig into the specifics of the text relative to the lens.
2. Identify non-obvious patterns, potential contradictions, and hidden implications.
3. Call out specific metrics, quotes, or findings and interpret what they mean for this persona.
4. Output your analysis in a structured, professional, and well-formatted Markdown document.

CRITICAL: Be extremely comprehensive. Provide a deep, exhaustive analysis of the ENTIRE document.`;
  } else if (action === 'ai_llm_prompt') {
    prompt = `Restructure the following document into a high-quality "System Prompt" or Contextual Injection format optimized for an LLM to read. 

Instructions:
- Wrap the core context in clear XML tags e.g. <document_context>.
- Isolate variables or moving parts.
- Provide a set of clear "Rules" or "Directives" for how the receiving LLM should use this data.
- The goal is to make this raw document easily digestible for an AI agent.

CRITICAL: Include the entire informational payload.`;
  } else if (action === 'ai_custom') {
    prompt = `Transform the following document exactly into the following format/specification:

"${customInstruction || 'Return as clean Markdown'}"

CRITICAL: Ensure the output matches the requested format precisely. Output the ENTIRE transformed document comprehensively.`;
  } else {
    // default / markdown_raw etc. – just return clean content
    return content;
  }

  prompt += `\n\n--- Document Name: ${fileName} ---\n\n${content.substring(0, 800000)}`;
  return prompt;
}

function buildMetadataPrompt(fileName: string, content: string): string {
  return `Analyze the following document and extract key metadata, a short summary, and 3-5 main topics or tags.

Document Name: ${fileName}

Content:
${content.substring(0, 800000)}`;
}

async function callGemini(prompt: string, model: string, apiKey: string, isJson = false) {
  const url = `${GEMINI_REST}/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: isJson ? 2048 : 8192,
    },
  };

  if (isJson) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}`);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const allowed = getAllowedOrigins(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin, allowed) });
    }

    if (url.pathname === '/gemini' && request.method === 'POST') {
      // Early size guard (fail fast before JSON parse)
      const len = parseInt(request.headers.get('content-length') || '0', 10);
      if (len > 2_000_000) {
        return new Response(JSON.stringify({ error: 'Payload too large' }), {
          status: 413,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed) },
        });
      }

      if (!checkRateLimit(ip)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed) },
        });
      }

      try {
        const req = (await request.json()) as ProxyRequest;

        if (!req.content || !req.fileName) {
          return new Response(JSON.stringify({ error: 'Missing content or fileName' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed) },
          });
        }

        let result: any;

        if (req.mode === 'metadata') {
          const prompt = buildMetadataPrompt(req.fileName, req.content);
          const raw = await callGemini(prompt, 'gemini-1.5-flash-latest', env.GEMINI_API_KEY, true);

          try {
            result = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
          } catch {
            result = { summary: raw, documentType: 'Unknown', sentiment: 'Neutral', keyEntities: [], tags: [] };
          }
        } else {
          const prompt = buildTransformPrompt(req);
          if (prompt === req.content) {
            result = req.content;
          } else {
            result = await callGemini(prompt, 'gemini-1.5-pro-latest', env.GEMINI_API_KEY, false);
          }
        }

        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed) },
        });
      } catch (err: any) {
        console.error('Worker error:', err);
        return new Response(JSON.stringify({ error: 'Proxy failure' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed) },
        });
      }
    }

    return new Response('Format-Smormat Gemini Proxy\nPOST /gemini', {
      headers: { 'Content-Type': 'text/plain', ...corsHeaders(origin, allowed) },
    });
  },
};
