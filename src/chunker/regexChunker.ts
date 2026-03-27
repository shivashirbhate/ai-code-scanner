// src/chunker/regexChunker.ts

import { Chunk } from '../types';

export function regexChunk(code: string): Chunk[] {
  const chunks: Chunk[] = [];

  function getLineNumber(index: number): number {
    return code.slice(0, index).split('\n').length - 1;
  }

  function pushChunk(
    type: 'function' | 'class' | 'block',
    content: string,
    index: number,
    name?: string
  ) {
    const startLine = getLineNumber(index);
    const endLine = getLineNumber(index + content.length);

    const base = {
      type,
      content,
      startLine,
      endLine
    };

    // ✅ handle optional name properly
    const chunk = name ? { ...base, name } : base;

    chunks.push(chunk);
  }

  // JS/TS functions
  const fnRegex = /function\s+(\w+)\s*\(.*?\)\s*\{[\s\S]*?\}/g;

  let match;
  while ((match = fnRegex.exec(code))) {
    pushChunk(
      'function',
      match[0],
      match.index,
      match[1]
    );
  }

  // Python functions
  const pyRegex = /def\s+(\w+)\s*\(.*?\):[\s\S]*?(?=\ndef|\nclass|$)/g;

  while ((match = pyRegex.exec(code))) {
    pushChunk(
      'function',
      match[0],
      match.index,
      match[1]
    );
  }

  // Classes
  const classRegex = /class\s+(\w+)[\s\S]*?\{/g;

  while ((match = classRegex.exec(code))) {
    pushChunk(
      'class',
      match[0],
      match.index,
      match[1]
    );
  }

  return chunks;
}