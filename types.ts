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

export type IRNodeKind = 'RAW_FILE' | 'MARKDOWN' | 'ENTITIES' | 'JSON' | 'CSV' | 'VECTOR' | 'IMAGE';

export interface IRNode {
  id: string;
  kind: IRNodeKind;
  content: any;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface IREdge {
  sourceId: string;
  targetId: string;
  relation: string;
}

export interface IRView {
  id: string;
  name: string;
  rootNodeId: string;
  activeLens: string;
}

export interface IREvent {
  id: string;
  timestamp: number;
  type: string;
  payload: any;
}

export interface IRGraph {
  nodes: Record<string, IRNode>;
  edges: IREdge[];
  views: Record<string, IRView>;
  events: IREvent[];
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  markdownName: string;
  content: string;
  originalSize: number;
  status: ConversionStatus;
  errorMessage?: string;
  timestamp: number;
  pdfUrl?: string; // Standard PDF URL
  fillablePdfUrl?: string; // Auto-generated fillable PDF URL
  images?: string[];
  rawFile?: File;
  performedAction?: string;
  aiMetadata?: any;
  aiStatus?: 'IDLE' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  suggestedActions?: { id: string, name: string, type: 'specialist' | 'universal', desc: string }[];
  irNodeId?: string; // Link to the IR Graph
}