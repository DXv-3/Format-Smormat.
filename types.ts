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
}