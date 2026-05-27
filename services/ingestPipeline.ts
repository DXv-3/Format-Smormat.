// ============================================================
// FORMAT-SMORMAT — ALWAYS-READY INTAKE PIPELINE
// Input → IR. Zero ceremony. Never getting ready.
// ============================================================
import {
  ProcessedFile,
  ConversionStatus,
  IRNodeKind,
  IREdge,
  IRLensType,
  SuggestedAction,
  WorkerRequest,
  WorkerResponse,
  ActionType,
} from '../types';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const WORKER_URL =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_WORKER_URL
    ? (import.meta as any).env.VITE_WORKER_URL
    : '/api'; // proxied in dev via vite.config.ts

const MAX_CONTENT_CHARS = 800_000;

// ─── WORKER CALL ─────────────────────────────────────────────────────────────

async function callWorker(req: WorkerRequest): Promise<WorkerResponse> {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Worker error ${res.status}: ${msg}`);
  }
  return res.json() as Promise<WorkerResponse>;
}

// ─── LOCAL PARSERS ───────────────────────────────────────────────────────────

/** Sniff MIME from file extension when File.type is unreliable */
function sniffMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    html: 'text/html',
    htm: 'text/html',
    json: 'application/json',
    md: 'text/markdown',
    txt: 'text/plain',
    zip: 'application/zip',
    crx: 'application/x-chrome-extension',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    csv: 'text/csv',
    yaml: 'application/yaml',
    yml: 'application/yaml',
  };
  return map[ext] ?? 'application/octet-stream';
}

/**
 * Reads a File to text using the appropriate local parser.
 * Returns { text, nodeKind }.
 */
export async function parseFileLocally(
  file: File
): Promise<{ text: string; nodeKind: IRNodeKind }> {
  const mime = file.type || sniffMime(file.name);

  // ── Plain text / Markdown / CSV / YAML ──────────────────────────────────
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/yaml'
  ) {
    const text = await file.text();
    const kind: IRNodeKind =
      mime === 'application/json'
        ? 'schema'
        : mime === 'application/yaml'
        ? 'config'
        : 'document';
    return { text: text.substring(0, MAX_CONTENT_CHARS), nodeKind: kind };
  }

  // ── HTML → Markdown via Turndown (dynamic import) ────────────────────────
  if (mime === 'text/html') {
    const html = await file.text();
    try {
      const TurndownService = (await import('turndown')).default;
      const td = new TurndownService();
      return { text: td.turndown(html).substring(0, MAX_CONTENT_CHARS), nodeKind: 'document' };
    } catch {
      // Turndown not available, return raw HTML stripped
      return {
        text: html.replace(/<[^>]+>/g, ' ').substring(0, MAX_CONTENT_CHARS),
        nodeKind: 'document',
      };
    }
  }

  // ── DOCX → text via Mammoth (dynamic import) ─────────────────────────────
  if (
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    try {
      const mammoth = await import('mammoth');
      const ab = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: ab });
      return { text: result.value.substring(0, MAX_CONTENT_CHARS), nodeKind: 'document' };
    } catch {
      return { text: `[DOCX: ${file.name} — mammoth parse failed]`, nodeKind: 'document' };
    }
  }

  // ── PDF → text via PDF.js (dynamic import) ────────────────────────────────
  if (mime === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();
      const ab = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: ab }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        pages.push(tc.items.map((it: any) => it.str).join(' '));
      }
      return { text: pages.join('\n').substring(0, MAX_CONTENT_CHARS), nodeKind: 'document' };
    } catch {
      return { text: `[PDF: ${file.name} — pdfjs parse failed]`, nodeKind: 'document' };
    }
  }

  // ── ZIP / CRX — list contents ─────────────────────────────────────────────
  if (mime === 'application/zip' || mime === 'application/x-chrome-extension') {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const names = Object.keys(zip.files).join('\n');
      return { text: `Archive contents:\n${names}`, nodeKind: 'codebase' };
    } catch {
      return { text: `[ZIP: ${file.name} — parse failed]`, nodeKind: 'codebase' };
    }
  }

  // ── Images — return placeholder ──────────────────────────────────────────
  if (mime.startsWith('image/')) {
    return {
      text: `[Image: ${file.name} — binary payload, size ${file.size} bytes]`,
      nodeKind: 'document',
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return {
    text: `[Unsupported format: ${file.name} (${mime})]`,
    nodeKind: 'unknown',
  };
}

// ─── METADATA → IR PATCH ─────────────────────────────────────────────────────

/**
 * Calls the Worker metadata endpoint and maps the response
 * to IRNode attribute updates and a SuggestedAction list.
 */
export async function enrichNodeViaWorker(
  fileId: string,
  fileName: string,
  content: string
): Promise<{
  attributes: Record<string, unknown>;
  suggestedActions: SuggestedAction[];
  edges: IREdge[];
}> {
  const req: WorkerRequest = {
    mode: 'metadata',
    fileName,
    content: content.substring(0, MAX_CONTENT_CHARS),
  };

  const res = await callWorker(req);

  // The Worker returns text for metadata mode (JSON inside text field)
  let meta: {
    summary?: string;
    documentType?: string;
    sentiment?: string;
    keyEntities?: string[];
    tags?: string[];
  } = {};

  try {
    meta = res.text ? JSON.parse(res.text) : {};
  } catch {
    meta = {};
  }

  const docType = (meta.documentType ?? 'document').toLowerCase();
  const kind = inferNodeKind(docType);

  const suggestedActions = buildSuggestedActions(kind, meta.tags ?? []);

  const edges: IREdge[] = (meta.keyEntities ?? []).map((entity) => ({
    id: `${fileId}-entity-${entity.replace(/\s+/g, '_')}`,
    from: fileId,
    to: entity.replace(/\s+/g, '_'),
    label: 'references' as const,
    weight: 0.8,
  }));

  return {
    attributes: {
      type: meta.documentType,
      tone: meta.sentiment,
      tags: meta.tags,
      summary: meta.summary,
      confidence: 0.9,
      updatedAt: Date.now(),
    },
    suggestedActions,
    edges,
  };
}

// ─── ACTION CALL ─────────────────────────────────────────────────────────────

export async function executeAction(
  fileName: string,
  content: string,
  action: ActionType,
  customInstruction?: string
): Promise<string> {
  const req: WorkerRequest = {
    mode: 'transform',
    fileName,
    content: content.substring(0, MAX_CONTENT_CHARS),
    action,
    customInstruction,
  };
  const res = await callWorker(req);
  if (res.error) throw new Error(res.error);
  return res.text ?? '';
}

// ─── LENS RENDER ─────────────────────────────────────────────────────────────

export async function renderLens(
  fileName: string,
  content: string,
  lens: IRLensType
): Promise<string> {
  const req: WorkerRequest = {
    mode: 'lens_render',
    fileName,
    content: content.substring(0, MAX_CONTENT_CHARS),
    lens,
  };
  const res = await callWorker(req);
  if (res.error) throw new Error(res.error);
  return res.text ?? '';
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function inferNodeKind(docType: string): IRNodeKind {
  if (docType.includes('invoice') || docType.includes('receipt')) return 'document';
  if (docType.includes('org') || docType.includes('team')) return 'org_unit';
  if (docType.includes('process') || docType.includes('workflow')) return 'process_step';
  if (docType.includes('agent') || docType.includes('config')) return 'agent';
  if (docType.includes('code') || docType.includes('script')) return 'codebase';
  if (docType.includes('schema') || docType.includes('json')) return 'schema';
  return 'document';
}

function buildSuggestedActions(
  kind: IRNodeKind,
  _tags: string[]
): SuggestedAction[] {
  const universal: SuggestedAction[] = [
    {
      id: 'second_brain',
      name: 'Second Brain',
      type: 'universal',
      desc: 'Organize into Obsidian/Notion PKM format',
      actionType: 'ai_second_brain',
    },
    {
      id: 'deep_insights',
      name: 'Deep Insights',
      type: 'universal',
      desc: 'Strategic analysis through a custom lens',
      actionType: 'ai_insights_deep',
    },
    {
      id: 'llm_prompt',
      name: 'LLM Prompt',
      type: 'universal',
      desc: 'Convert to optimized system prompt / context injection',
      actionType: 'ai_llm_prompt',
    },
    {
      id: 'extract_schema',
      name: 'Extract Schema',
      type: 'universal',
      desc: 'Pull structured data schema from content',
      actionType: 'extract_schema',
    },
  ];

  const specialist: SuggestedAction[] = [];

  if (kind === 'org_unit') {
    specialist.push({
      id: 'agent_swarm',
      name: 'Agent Swarm Config',
      type: 'specialist',
      desc: 'Convert org chart to multi-agent coordination config',
      actionType: 'agent_swarm_config',
    });
  }

  if (kind === 'process_step') {
    specialist.push({
      id: 'multi_lens',
      name: 'Multi-Lens Workflow',
      type: 'specialist',
      desc: 'Emit agent, biology, and city metaphor views',
      actionType: 'multi_lens_workflow',
    });
  }

  const lensActions: SuggestedAction[] = [
    {
      id: 'lens_biology',
      name: 'Biology Lens',
      type: 'lens',
      desc: 'Re-express as biological system (octopus/ant colony)',
      actionType: 'multi_lens_workflow',
      targetLens: 'metaphor_biology',
    },
    {
      id: 'lens_city',
      name: 'City Lens',
      type: 'lens',
      desc: 'Re-express as urban infrastructure metaphor',
      actionType: 'multi_lens_workflow',
      targetLens: 'metaphor_city',
    },
    {
      id: 'lens_agent',
      name: 'Agent Lens',
      type: 'lens',
      desc: 'Convert to multi-agent workflow graph',
      actionType: 'agent_swarm_config',
      targetLens: 'agent',
    },
  ];

  return [...specialist, ...universal, ...lensActions];
}

// ─── FULL INTAKE PIPELINE ORCHESTRATOR ───────────────────────────────────────

/**
 * Runs the full intake pipeline for a single file:
 * File → local parse → IR node → Worker enrichment → IR patch
 *
 * Returns updates to apply via the store.
 */
export async function runIntakePipeline(
  file: File,
  fileId: string,
  callbacks: {
    onParsed: (text: string, nodeKind: IRNodeKind) => void;
    onEnriched: (
      attributes: Record<string, unknown>,
      actions: SuggestedAction[],
      edges: IREdge[]
    ) => void;
    onError: (err: Error) => void;
  }
): Promise<void> {
  try {
    // Stage 1: Local parse
    const { text, nodeKind } = await parseFileLocally(file);
    callbacks.onParsed(text, nodeKind);

    // Stage 2: Worker enrichment (metadata + classification)
    const { attributes, suggestedActions, edges } = await enrichNodeViaWorker(
      fileId,
      file.name,
      text
    );
    callbacks.onEnriched(attributes, suggestedActions, edges);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
