// ============================================================
// FORMAT-SMORMAT — CANONICAL TYPE SYSTEM
// "Anything in, anything out, via one brain."
// ============================================================

// ─── LEGACY STATUS (kept for backward compat during migration) ───────────────
export enum ConversionStatus {
  IDLE = 'IDLE',
  ANALYZING_INGESTION = 'ANALYZING_INGESTION',
  GAME_PLAN_READY = 'GAME_PLAN_READY',
  AWAITING_ACTION = 'AWAITING_ACTION',
  READING = 'READING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

// ─── IR: NODE ────────────────────────────────────────────────────────────────

export type IRNodeKind =
  | 'document'
  | 'section'
  | 'person'
  | 'org_unit'
  | 'process_step'
  | 'agent'
  | 'tool'
  | 'concept'
  | 'metaphor_cell'
  | 'schema'
  | 'codebase'
  | 'config'
  | 'unknown';

export interface IRNodeAttributes {
  type?: string;           // inferred document type (invoice, contract, etc.)
  tone?: string;           // sentiment / tone
  domain?: string;         // subject domain
  tags?: string[];         // free-form tags
  language?: string;       // detected language
  confidence?: number;     // 0–1 classification confidence
  createdAt?: number;
  updatedAt?: number;
  sourceFile?: string;     // originating file name
  mimeType?: string;
  lens?: IRLensType;       // which lens produced this node
  [key: string]: unknown;
}

export interface IRNode {
  id: string;              // stable uuid
  kind: IRNodeKind;
  label: string;           // human-readable name
  payload: IRPayload;
  attributes: IRNodeAttributes;
  viewIds: string[];       // which IRViews reference this node
}

export type IRPayload =
  | { type: 'text';    value: string }
  | { type: 'binary';  ref: string;   mimeType: string }
  | { type: 'json';    value: unknown }
  | { type: 'code';    value: string; language: string }
  | { type: 'empty' };

// ─── IR: EDGE ────────────────────────────────────────────────────────────────

export type IREdgeLabel =
  | 'contains'
  | 'references'
  | 'depends_on'
  | 'transforms_to'
  | 'controls'
  | 'signals'
  | 'analogous_to'
  | 'part_of'
  | 'authored_by'
  | 'tagged_with'
  | 'derived_from';

export interface IREdge {
  id: string;
  from: string;            // IRNode.id
  to: string;              // IRNode.id
  label: IREdgeLabel;
  weight?: number;         // 0–1 confidence / strength
  attributes?: Record<string, unknown>;
}

// ─── IR: VIEW ────────────────────────────────────────────────────────────────

export type IRLensType =
  | 'file'                 // Markdown, PDF, DOCX, HTML
  | 'agent'                // tool graphs, workflows, MCP configs
  | 'knowledge'            // tables, KG visualizations
  | 'metaphor_biology'     // octopus / ant colony
  | 'metaphor_city'        // city layout
  | 'metaphor_swarm'       // swarm intelligence
  | 'metaphor_orchestra';  // orchestral arrangement

export interface IRView {
  id: string;
  lens: IRLensType;
  nodeIds: string[];       // IR nodes participating in this view
  artifact: IRArtifact;    // the rendered output of this view
  generatedAt: number;
}

export type IRArtifact =
  | { type: 'markdown';   content: string }
  | { type: 'json';       content: unknown }
  | { type: 'yaml';       content: string }
  | { type: 'html';       content: string }
  | { type: 'image_urls'; urls: string[] }
  | { type: 'agent_config'; content: Record<string, unknown> }
  | { type: 'kg_json';    nodes: IRNode[]; edges: IREdge[] }
  | { type: 'pending' };

// ─── IR: EVENT SYSTEM ────────────────────────────────────────────────────────

export type IREventType =
  | 'InputIngested'
  | 'ParsedToIR'
  | 'RelationsDiscovered'
  | 'ViewsPrepared'
  | 'ActionRequested'
  | 'ActionCompleted'
  | 'IRUpdated'
  | 'Error';

export interface IREvent {
  id: string;
  type: IREventType;
  nodeId?: string;         // primary node this event concerns
  viewId?: string;         // primary view this event concerns
  payload?: unknown;
  error?: string;
  timestamp: number;
}

// ─── IR: GRAPH (the brain) ───────────────────────────────────────────────────

export interface IRGraph {
  nodes: Record<string, IRNode>;
  edges: Record<string, IREdge>;
  views: Record<string, IRView>;
  events: IREvent[];       // append-only event log
}

// ─── ACTION SURFACE ──────────────────────────────────────────────────────────

export type ActionType =
  | 'ai_second_brain'
  | 'ai_insights_deep'
  | 'ai_llm_prompt'
  | 'ai_custom'
  | 'extract_schema'
  | 'summarize'
  | 'make_fillable'
  | 'extract_images'
  | 'agent_swarm_config'
  | 'multi_lens_workflow'
  | 'export_kg';

export interface SuggestedAction {
  id: string;
  name: string;
  type: 'specialist' | 'universal' | 'lens';
  desc: string;
  actionType: ActionType;
  targetLens?: IRLensType;
}

// ─── WORKER API CONTRACTS ────────────────────────────────────────────────────

/** What the frontend sends to the Worker */
export interface WorkerRequest {
  mode: 'transform' | 'metadata' | 'ir_enrich' | 'lens_render';
  nodeId?: string;         // IR node to operate on
  action?: ActionType;
  customInstruction?: string;
  fileName: string;
  content: string;         // text payload (never a key)
  lens?: IRLensType;       // for lens_render mode
}

/** What the Worker returns — always sanitized */
export interface WorkerResponse {
  text?: string;           // transform / metadata text
  irPatch?: Partial<IRGraph>; // incremental IR update
  error?: string;
}

// ─── PROCESSED FILE (legacy bridge — maps to IR) ────────────────────────────

export interface ProcessedFile {
  id: string;              // also the primary IRNode.id for this file
  originalName: string;
  markdownName: string;
  content: string;
  originalSize: number;
  status: ConversionStatus;
  errorMessage?: string;
  timestamp: number;
  pdfUrl?: string;
  fillablePdfUrl?: string;
  images?: string[];
  rawFile?: File;
  performedAction?: string;
  aiMetadata?: {
    summary?: string;
    documentType?: string;
    sentiment?: string;
    keyEntities?: string[];
    tags?: string[];
  };
  aiStatus?: 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  suggestedActions?: SuggestedAction[];
  // IR bridge fields
  irNodeId?: string;       // points to IRGraph.nodes[id]
  activeViewIds?: string[];
}
