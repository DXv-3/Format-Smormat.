// ============================================================
// FORMAT-SMORMAT — HARDENED CLOUDFLARE WORKER
// Sole gateway to all LLM/model APIs. Zero keys to client.
// "Anything in, anything out, via one brain."
// ============================================================

export interface Env {
  GEMINI_API_KEY: string;  // CF Worker secret — never returned to client
  ALLOWED_ORIGINS?: string;
}

import type { WorkerRequest, IRLensType } from '../../types';

const GEMINI_REST = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_HEAVY = 'gemini-2.5-pro-preview-06-05';
const MODEL_LIGHT = 'gemini-2.5-flash-preview-05-20';
const MAX_PAYLOAD_BYTES = 10_000_000; // 10 MB
const MAX_CONTENT_CHARS = 800_000;
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const MAX_RATE_ENTRIES = 1_000;
const ALLOWED_ORIGINS_DEFAULT = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8787'];

// ─── CORS ────────────────────────────────────────────────────────────────────

function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || ALLOWED_ORIGINS_DEFAULT.join(',');
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function corsHeaders(
  origin: string | null,
  allowed: string[]
): Record<string, string> {
  const allow =
    origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; reset: number }>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateMap.size >= MAX_RATE_ENTRIES) {
    const oldest = rateMap.keys().next().value as string | undefined;
    if (oldest !== undefined) rateMap.delete(oldest);
  }
  let entry = rateMap.get(ip);
  if (!entry || now > entry.reset) entry = { count: 0, reset: now + WINDOW_MS };
  entry.count += 1;
  rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

// ─── PROMPT BUILDERS — all prompts templated server-side ─────────────────────

export function buildTransformPrompt(
  action: string | undefined,
  customInstruction: string | undefined,
  fileName: string,
  content: string
): object {
  let prompt = '';

  switch (action) {
    case 'ai_second_brain':
      prompt = `You are an expert Personal Knowledge Management (PKM) assistant. Organize the following document into a pristine markdown file tailored for an Obsidian/Notion "Second Brain".

Required Format:
1. YAML frontmatter: title, date, tags (array), aliases (array), source_type.
2. "## Abstract" — 1-paragraph summary.
3. "## Core Concepts" — 5–10 bidirectional links formatted as [[Topic Name]].
4. Remaining content with proper H2/H3 headers, bullets, and bolded entities.

CRITICAL: Process and synthesize the ENTIRE document. Do NOT truncate or omit sections.`;
      break;

    case 'ai_insights_deep':
      prompt = `You are a world-class strategic analyst. Analyze the document through this lens/persona:

"${sanitizeInstruction(customInstruction)}"

Instructions:
1. Dig into specifics relative to the lens.
2. Identify non-obvious patterns, contradictions, hidden implications.
3. Quote specific metrics or findings and interpret them for this persona.
4. Output structured Markdown with clear headers and authoritative tone.

CRITICAL: Comprehensive, exhaustive analysis. Do not truncate.`;
      break;

    case 'ai_llm_prompt':
      prompt = `Restructure the document into a high-quality System Prompt / Contextual Injection format optimized for LLM ingestion.

Instructions:
- Wrap core context in XML tags: <document_context>.
- Isolate variables and moving parts.
- Provide clear <rules> and <directives> for a receiving LLM agent.
- Preserve the entire informational payload — an AI agent needs every detail.

CRITICAL: Include complete content without abbreviation.`;
      break;

    case 'ai_custom':
      prompt = `Transform the document exactly per this specification:

"${sanitizeInstruction(customInstruction)}"

CRITICAL: Match the requested format precisely. Output the ENTIRE transformed document. If a specific file format is requested (CSV, JSON), output only that raw format.`;
      break;

    case 'extract_schema':
      prompt = `Extract a structured JSON schema from the document. Identify all data entities, their fields, types, and relationships. Output valid JSON only.`;
      break;

    case 'agent_swarm_config':
      prompt = `Convert the following org chart or process document into a multi-agent coordination configuration.

Output format (JSON):
{
  "agents": [ { "id", "role", "responsibilities": [], "tools": [], "reports_to": null } ],
  "coordination_protocol": "",
  "communication_channels": []
}

CRITICAL: Map every role/unit to an agent. Preserve hierarchies as reports_to relationships.`;
      break;

    case 'multi_lens_workflow':
      prompt = `Re-express the following process document through THREE lenses simultaneously:

1. **Agent Lens** — A concrete multi-agent workflow YAML config.
2. **Biology Lens** — A narrative analogy using biological systems (octopus, ant colony, immune system).
3. **City Lens** — A narrative analogy using urban infrastructure (roads, districts, utilities).

For each lens, provide both a narrative description and a concrete artifact (YAML/JSON/Markdown).
Label each section clearly: ## Agent Lens, ## Biology Lens, ## City Lens.`;
      break;

    default:
      prompt = `Process and analyze the following document. Extract key information, summarize main points, and present findings in clean, structured Markdown.`;
  }

  prompt += `\n\n--- Document: ${fileName} ---\n\n${content.substring(0, MAX_CONTENT_CHARS)}`;

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192 },
  };
}

export function buildMetadataPrompt(fileName: string, content: string): object {
  return {
    contents: [
      {
        parts: [
          {
            text: `Analyze the following document and return structured metadata.\n\nDocument: ${fileName}\n\n${content.substring(
              0,
              MAX_CONTENT_CHARS
            )}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING', description: 'Concise 2–3 sentence summary.' },
          documentType: { type: 'STRING', description: 'Inferred document category (Invoice, Contract, Org Chart, Process Doc, Codebase, etc.).' },
          sentiment: { type: 'STRING', description: 'Overall tone (Neutral, Positive, Negative, Formal, Technical).' },
          keyEntities: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Main entities, people, organizations, concepts.' },
          tags: { type: 'ARRAY', items: { type: 'STRING' }, description: '3–5 relevant tags.' },
        },
        required: ['summary', 'documentType', 'sentiment', 'keyEntities', 'tags'],
      },
    },
  };
}

export function buildLensPrompt(
  lens: IRLensType,
  fileName: string,
  content: string
): object {
  const lensInstructions: Record<IRLensType, string> = {
    file:
      'Render the document as clean, well-structured Markdown optimized for reading.',
    agent:
      'Convert the document into a multi-agent workflow YAML configuration. Define agents, tools, responsibilities, and communication protocols.',
    knowledge:
      'Extract a knowledge graph from the document. Return JSON with nodes (entities) and edges (relationships).',
    metaphor_biology:
      'Re-express the document as a biological system analogy. Use organisms, cells, neural networks, or ecosystems. Provide both narrative and a structured mapping table.',
    metaphor_city:
      'Re-express the document as urban infrastructure. Map components to roads, districts, utilities, and governance. Provide narrative and structured mapping.',
    metaphor_swarm:
      'Re-express as a swarm intelligence system (ant colony, bee swarm). Map processes to emergent behaviors. Provide narrative and structured mapping.',
    metaphor_orchestra:
      'Re-express as an orchestral arrangement. Map roles to instruments and sections. Identify the conductor, soloists, and ensemble. Provide narrative and structured mapping.',
  };

  const instruction =
    lensInstructions[lens] ??
    'Analyze and re-express the document in the most informative way possible.';

  return {
    contents: [
      {
        parts: [
          {
            text: `${instruction}\n\n--- Document: ${fileName} ---\n\n${content.substring(
              0,
              MAX_CONTENT_CHARS
            )}`,
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 8192 },
  };
}

// ─── OUTPUT SANITIZER ─────────────────────────────────────────────────────────

function sanitizeOutput(text: string): string {
  // Strip any accidental key-like strings the model might echo
  return text
    .replace(/AIza[\w-]{35}/g, '[REDACTED]')
    .replace(/sk-[\w-]{40,}/g, '[REDACTED]')
    .replace(/Bearer\s+[\w-]{20,}/gi, 'Bearer [REDACTED]');
}

function sanitizeInstruction(instruction: string | undefined): string {
  if (!instruction) return '';
  // Limit length, strip prompt injection attempts
  return instruction
    .substring(0, 2000)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\bignore\s+all\s+previous\b/gi, '')
    .trim();
}

// ─── GEMINI CALL ──────────────────────────────────────────────────────────────

async function callGemini(
  env: Env,
  model: string,
  body: object
): Promise<string> {
  const url = `${GEMINI_REST}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${err}`);
  }
  const data = (await res.json()) as any;
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return sanitizeOutput(text);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = getAllowedOrigins(env);
    const cors = corsHeaders(origin, allowed);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Origin enforcement
    if (origin && !allowed.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Method gate
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Content-Length pre-check
    const cl = request.headers.get('content-length');
    if (cl && parseInt(cl, 10) > MAX_PAYLOAD_BYTES) {
      return new Response('Payload Too Large', { status: 413, headers: cors });
    }

    // IP rate limit
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return new Response('Rate Limit Exceeded', { status: 429, headers: cors });
    }

    try {
      // Buffer + size-check
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > MAX_PAYLOAD_BYTES) {
        return new Response('Payload Too Large', { status: 413, headers: cors });
      }

      const reqBody = JSON.parse(new TextDecoder().decode(buffer)) as WorkerRequest;

      // ── Validate required fields ──────────────────────────────────────────
      if (!reqBody.fileName || typeof reqBody.content !== 'string') {
        return new Response('Bad Request: missing fileName or content', {
          status: 400,
          headers: cors,
        });
      }

      let resultText = '';

      // ── Route by mode ─────────────────────────────────────────────────────
      switch (reqBody.mode) {
        case 'metadata': {
          const body = buildMetadataPrompt(reqBody.fileName, reqBody.content);
          resultText = await callGemini(env, MODEL_LIGHT, body);
          break;
        }

        case 'transform': {
          const body = buildTransformPrompt(
            reqBody.action,
            reqBody.customInstruction,
            reqBody.fileName,
            reqBody.content
          );
          resultText = await callGemini(env, MODEL_HEAVY, body);
          break;
        }

        case 'lens_render': {
          if (!reqBody.lens) {
            return new Response('Bad Request: lens_render requires lens field', {
              status: 400,
              headers: cors,
            });
          }
          const body = buildLensPrompt(
            reqBody.lens as IRLensType,
            reqBody.fileName,
            reqBody.content
          );
          resultText = await callGemini(env, MODEL_HEAVY, body);
          break;
        }

        case 'ir_enrich': {
          // Future: IR-aware enrichment with graph context
          const body = buildMetadataPrompt(reqBody.fileName, reqBody.content);
          resultText = await callGemini(env, MODEL_LIGHT, body);
          break;
        }

        default:
          return new Response('Bad Request: unknown mode', {
            status: 400,
            headers: cors,
          });
      }

      return new Response(JSON.stringify({ text: resultText }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    } catch (e) {
      console.error('[Worker Error]', e);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      );
    }
  },
};
