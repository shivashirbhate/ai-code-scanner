// src/scanner/fileScanner.ts

import fs from 'fs';
import path from 'path';
import { isValidFile } from './fileFilter';
import { MAX_FILE_SIZE, IGNORE_FOLDERS } from '../utils/constants';
import { ScannedFile } from '../types';

export function scanDirectory(
  dirPath: string,
  basePath: string
): ScannedFile[] {
  let results: ScannedFile[] = [];

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);

    // Ignore folders
    if (IGNORE_FOLDERS.some((folder) => fullPath.includes(folder))) {
      continue;
    }

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, basePath));
    } else {
      if (isValidFile(fullPath) && stats.size <= MAX_FILE_SIZE) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        results.push({
          path: path.relative(basePath, fullPath),
          extension: path.extname(fullPath),
          size: stats.size,
          content
        });
      }
    }
  }

  return results;
}