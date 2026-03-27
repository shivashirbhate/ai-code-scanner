// src/scanner/fileFilter.ts

import path from 'path';
import { SUPPORTED_EXTENSIONS } from '../utils/constants';

export function isValidFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  return SUPPORTED_EXTENSIONS.includes(ext);
}