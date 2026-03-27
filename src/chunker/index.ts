// src/chunker/index.ts

import { chunkTSFile } from './tsChunker';
import { regexChunk } from './regexChunker';

export function chunkFile(file: any) {
  try {
    if (file.extension === '.ts' || file.extension === '.js') {
      const chunks = chunkTSFile(file.content);

      if (chunks.length > 0) return chunks;
    }
  } catch (err) {
    console.warn("AST parsing failed, fallback to regex");
  }

  return regexChunk(file.content);
}