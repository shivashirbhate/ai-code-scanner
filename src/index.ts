// src/index.ts

import fs from 'fs';
import path from 'path';
import { scanDirectory } from './scanner/fileScanner';
import { ScanResult } from './types';

const TARGET_PATH = process.argv[2] || './';

function runScanner(): void {
  const absolutePath = path.resolve(TARGET_PATH);

  console.log('📂 Scanning:', absolutePath);

  const files = scanDirectory(absolutePath, absolutePath);

  const output: ScanResult = {
    projectRoot: absolutePath,
    totalFiles: files.length,
    files
  };

  const outputDir = path.resolve('output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(
    path.join(outputDir, 'scan-result.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('✅ Scan complete. Output saved to output/scan-result.json');
}

runScanner();