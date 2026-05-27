export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS?: string;
}

interface ProxyRequest {
  mode: 'transform' | 'metadata' | 'lens_render' | 'ir_enrich';
  action?: string;
  customInstruction?: string;
  lensId?: string;
  nodeData?: string;
  fileName?: string;
  content: string;
}

const GEMINI_REST = 'https://generativelanguage.googleapis.com/v1beta';
const ALLOWED_ORIGINS_DEFAULT = ['http://localhost:3000', 'http://localhost:8787'];

function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || ALLOWED_ORIGINS_DEFAULT.join(',');
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const allow = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const MAX_RATE_ENTRIES = 1000;

function getClientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
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

export function buildTransformPrompt(action: string | undefined, customInstruction: string | undefined, fileName: string, content: string): any {
  let prompt = "";
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

CRITICAL: Do NOT simply abbreviate or truncate the content. You must process and synthesize the ENTIRE document comprehensively. Do NOT leave out sections or use phrases like "rest of document omitted".`;
  } else if (action === 'ai_insights_deep') {
    prompt = `You are a world-class strategic analyst. Analyze the following document aggressively through the specific lens or persona provided below.

Your Lens/Focus/Persona:
"${customInstruction}"

Instructions:
1. Get your hands dirty. Dig into the specifics of the text relative to the lens.
2. Identify non-obvious patterns, potential contradictions, and hidden implications.
3. Call out specific metrics, quotes, or findings and interpret what they mean for this persona.
4. Output your analysis in a structured, professional, and well-formatted Markdown document. Use clear headers and authoritative tone. Do not just summarize; critically evaluate the document.

CRITICAL: Be extremely comprehensive. Provide a deep, exhaustive analysis of the ENTIRE document. Do not truncate your insights.`;
  } else if (action === 'ai_llm_prompt') {
    prompt = `Restructure the following document into a high-quality "System Prompt" or Contextual Injection format optimized for an LLM to read. 

Instructions:
- Wrap the core context in clear XML tags e.g. <document_context>.
- Isolate variables or moving parts.
- Provide a set of clear "Rules" or "Directives" for how the receiving LLM should use this data.
- The goal is to make this raw document easily digestible for an AI agent to execute tasks against.

CRITICAL: Include the entire informational payload. Do not skip or abbreviate sections. An AI agent will need every detail to successfully use this prompt later.`;
  } else if (action === 'ai_custom') {
    prompt = `Transform the following document exactly into the following format/specification:
    
"${customInstruction}"

CRITICAL: Ensure the output matches the requested format precisely. Output the ENTIRE transformed document comprehensively without truncating or leaving parts out. If the user asked for a specific file format (e.g., CSV, JSON), output ONLY that raw format without any conversational filler or codeblock ticks wrapped around it if possible, or use clean codeblocks.`;
  }

  prompt += `\n\n--- Document Name: ${fileName} ---\n\n${content.substring(0, 800000)}`;

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192 }
  };
}

export function buildMetadataPrompt(fileName: string, content: string): any {
  return {
    contents: [{
      parts: [{
        text: `Analyze the following document and extract key metadata, a short summary, and 3-5 main topics or tags.\n\nDocument Name: ${fileName}\n\nContent:\n${content.substring(0, 800000)}`
      }]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING", description: "A concise 2-3 sentence summary of the document." },
          documentType: { type: "STRING", description: "The inferred type or category of the document (e.g., Invoice, Article, Report, Receipt, Code)." },
          sentiment: { type: "STRING", description: "The overall sentiment or tone of the document (e.g., Neutral, Positive, Negative, Formal)." },
          keyEntities: { type: "ARRAY", items: { type: "STRING" }, description: "Main entities, people, organizations, or concepts mentioned." },
          tags: { type: "ARRAY", items: { type: "STRING" }, description: "3-5 relevant tags for the document." }
        },
        required: ["summary", "documentType", "sentiment", "keyEntities", "tags"]
      }
    }
  };
}

export function buildLensRenderPrompt(lensId: string, fileName: string | undefined, content: string): any {
  let prompt: string;
  if (lensId === 'json') {
    prompt = `Extract the core structured data from the following document into pure JSON format. Ensure all key entities, dates, numbers, and relationships are captured in a structured schema. Output ONLY valid JSON. Omit conversational filler.`;
  } else if (lensId === 'entities') {
    prompt = `Identify all key entities (People, Organizations, Locations, Concepts, Projects) in the document. Produce a Markdown list describing the entities and how they relate. Make it highly scannable, like a Knowledge Graph Node directory.`;
  } else if (lensId === 'code') {
    prompt = `Extract any code blocks, technical snippets, parameters, or configurations found in the document. If no explicit code is found, outline the technical variables or pseudo-code that represents the logic described in the document.`;
  } else if (lensId === 'vision') {
    prompt = `Create a vivid, highly descriptive visually-focused breakdown of the document. Describe UI/UX details, spatial layouts, or visual characteristics mentioned or implied in the content. Map it out textually as if describing a canvas.`;
  } else if (lensId === 'summary') {
    prompt = `Provide a razor-sharp, dense summary of the document. Cut out fluff. Maximum impact, highly condensed bullet points highlighting the core thesis.`;
  } else {
    prompt = `Parse the following document strictly into the requested format: ${lensId}.`;
  }

  prompt += `\n\n--- Document Name: ${fileName || 'unnamed'} ---\n\n${content.substring(0, 800000)}`;

  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192 }
  };
}

export function buildIrEnrichPrompt(nodeData: string | undefined, content: string): any {
  return {
    contents: [{
      parts: [{
        text: `Enrich the following Information Retrieval Graph Node. Identify any missing context or relationships. Output valid JSON representing an enriched node.\n\nNode Data: ${nodeData}\n\nContent:\n${content.substring(0, 800000)}`
      }]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192
    }
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowedOrigins = getAllowedOrigins(env);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin, allowedOrigins)
      });
    }

    // CORS block
    if (origin && !allowedOrigins.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Check content length header if strictly applied
    const cl = request.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 10_000_000) {
      return new Response('Payload too large', { status: 413 });
    }

    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return new Response('Rate Limit Exceeded', { status: 429 });
    }

    try {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 10_000_000) {
         return new Response('Payload too large', { status: 413 });
      }

      const bodyStr = new TextDecoder().decode(buffer);
      const reqBody: ProxyRequest = JSON.parse(bodyStr);

      const mode = reqBody.mode;
      const usePro = mode === 'transform' || mode === 'lens_render';
      const geminiUrl = `${GEMINI_REST}/models/${usePro ? 'gemini-3.1-pro-preview' : 'gemini-3.1-flash-lite-preview'}:generateContent?key=${env.GEMINI_API_KEY}`;

      let geminiBody: any;
      if (mode === 'transform') {
        geminiBody = buildTransformPrompt(reqBody.action, reqBody.customInstruction, reqBody.fileName || '', reqBody.content);
      } else if (mode === 'metadata') {
        geminiBody = buildMetadataPrompt(reqBody.fileName || '', reqBody.content);
      } else if (mode === 'lens_render') {
        geminiBody = buildLensRenderPrompt(reqBody.lensId || 'markdown', reqBody.fileName, reqBody.content);
      } else if (mode === 'ir_enrich') {
        geminiBody = buildIrEnrichPrompt(reqBody.nodeData, reqBody.content);
      }

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiBody)
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error(`Upstream Gemini error: ${geminiResponse.status}`, errText);
        return new Response('Error contacting AI service.', {
          status: 502,
          headers: corsHeaders(origin, allowedOrigins)
        });
      }

      const data = await geminiResponse.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return new Response(JSON.stringify({ text }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin, allowedOrigins)
        }
      });
    } catch (e) {
      console.error(e);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
