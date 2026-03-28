// src/index.ts

import fs from 'fs';
import path from 'path';
import { LLMClient } from './ai/llmClient';
import { PromptBuilder } from './ai/promptBuilder';
import { chunkFile } from './chunker';
import { generateHash } from './utils/hash';

/**
 * Main async function to run the CLI tool.
 * It takes a file path and an action from the command line,
 * generates a prompt, and asks the LLM for an analysis.
 */
async function run(): Promise<void> {
  const [,, filePath, action] = process.argv;

  // 1. Validate arguments
  if (!filePath || !action) {
    console.error('Error: Missing arguments.');
    console.error('Usage: ts-node src/index.ts <file-path> <action>');
    console.error('Actions: "explain", "trace", "chunk", or "chunk-all"');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);

  // 2. Read file content
  let code: string;
  try {
    code = fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`Error: Could not read file at ${absolutePath}`);
    process.exit(1);
  }

  // 3. Perform action
  switch (action.toLowerCase()) {
    case 'explain':
    case 'trace': {
      console.log(`\n🚀 Analyzing ${path.basename(absolutePath)} with LLM for "${action}"...`);
      try {
        const prompt = action.toLowerCase() === 'explain'
          ? PromptBuilder.explainCode(code)
          : PromptBuilder.traceExecution(code);

        const llmClient = new LLMClient();
        const response = await llmClient.ask(prompt);
        console.log('\n--- AI Response ---\n');
        console.log(response);
        console.log('\n-------------------\n');
      } catch (error: any) {
        console.error(error.message);
        process.exit(1);
      }
      break;
    }

    case 'chunk': {
      console.log(`\n📦 Chunking ${path.basename(absolutePath)}...`);
      const file = {
        extension: path.extname(absolutePath),
        content: code,
      };
      const chunks = chunkFile(file);
      console.log('\n--- Chunks Found ---\n');
      console.log(JSON.stringify(chunks, null, 2));
      console.log(`\n✅ Total chunks: ${chunks.length}\n`);
      break;
    }

    case 'chunk-all': {
      console.log(`\n📦 Bulk chunking all files from ${path.basename(absolutePath)}...`);
      let scanData;
      try {
        scanData = JSON.parse(code);
      } catch (e) {
        console.error('Error: Provided file is not a valid JSON file.');
        process.exit(1);
      }

      if (!scanData || !scanData.files) {
        console.error('Error: JSON does not contain a "files" array. Please provide a valid scan-result.json.');
        process.exit(1);
      }

      const uniqueChunks = new Map<string, any>();

      for (const file of scanData.files) {
        const chunks = chunkFile(file);

        chunks.forEach((chunk: any) => {
          const hash = generateHash(chunk.content);
          if (!uniqueChunks.has(hash)) {
            uniqueChunks.set(hash, { id: hash, file: file.path, ...chunk, hash });
          }
        });
      }

      const finalChunks = Array.from(uniqueChunks.values());
      const outputPath = path.resolve('output/chunks.json');
      fs.writeFileSync(outputPath, JSON.stringify({ chunks: finalChunks }, null, 2));
      console.log(`✅ Chunking complete. ${finalChunks.length} unique chunks saved to output/chunks.json\n`);
      break;
    }

    default:
      console.error(`Error: Invalid action "${action}". Use "explain", "trace", "chunk", or "chunk-all".`);
      process.exit(1);
  }
}

run();