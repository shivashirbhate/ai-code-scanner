// src/utils/constants.ts

export const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.py', '.java'];

export const MAX_FILE_SIZE = 200 * 1024; // 200KB

export const IGNORE_FOLDERS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.angular'
];

export const LLM_URL = 'http://ollama:11434/api/generate';

export const LLM_MODEL = 'gemma3:12b'; // || 'qwen2.5-coder';
