// src/types/index.ts

export interface ScannedFile {
  path: string;
  extension: string;
  size: number;
  content: string;
}

export interface ScanResult {
  projectRoot: string;
  totalFiles: number;
  files: ScannedFile[];
}

export interface Chunk {
  id?: string;
  file?: string;
  type: 'function' | 'class' | 'block';
  name?: string;
  content: string;
  startLine: number;
  endLine: number;
  hash?: string;
  language?: string;
}

export type ChunkType = 'function' | 'class' | 'block';