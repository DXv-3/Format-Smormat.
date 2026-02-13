export enum ConversionStatus {
  IDLE = 'IDLE',
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
}