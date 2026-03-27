// src/chunker/runChunking.ts

import fs from 'fs';
import path from 'path';
import { chunkFile } from './index';

const inputPath = path.resolve('output/scan-result.json');
const outputPath = path.resolve('output/chunks.json');

const scanData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
import { generateHash } from '../utils/hash';

const uniqueChunks = new Map<string, any>();

for (const file of scanData.files) {
  const chunks = chunkFile(file);

  chunks.forEach((chunk: any) => {
    const hash = generateHash(chunk.content);

    if (!uniqueChunks.has(hash)) {
      uniqueChunks.set(hash, {
        id: hash,
        file: file.path,
        ...chunk,
        hash
      });
    }
  });
}

const finalChunks = Array.from(uniqueChunks.values());

fs.writeFileSync(
  outputPath,
  JSON.stringify({ chunks: finalChunks }, null, 2)
);

console.log("✅ Chunking complete");