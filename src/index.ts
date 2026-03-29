// src/index.ts

import fs from 'fs';
import path from 'path';
import { LLMClient } from './ai/llmClient';
import { PromptBuilder } from './ai/promptBuilder';
import { chunkFile } from './chunker';
import { generateHash } from './utils/hash';
import { scanDirectory } from './scanner/fileScanner';
import { StaticAnalyzer } from './scanner/staticAnalyzer';
import { SecurityScanner } from './scanner/securityScanner';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from './utils/constants';

function printHelp() {
  console.log(`
Usage: ts-node src/index.ts <path> <action>

Actions:
  explain           Explain the code in the specified file using LLM
  trace             Trace the execution flow of the code using LLM
  chunk             Chunk a single file and print to console
  chunk-all         Bulk chunk all files from a provided scan-result.json
  scan-and-chunk    Scan a directory and chunk all supported files
  analyze           Analyze a file for code smells (Static Analysis)
  security-scan     Scan a file for SQLi, XSS, and hardcoded secrets
  validate-report   Scan directory, validate for smells, and generate a report
  
Commands:
  help              Show this help message
  settings          Show current application settings
`);
}

/**
 * Main async function to run the CLI tool.
 * It takes a file path and an action from the command line,
 * generates a prompt, and asks the LLM for an analysis.
 */
async function run(): Promise<void> {
  const [,, arg1, arg2] = process.argv;

  if (!arg1 || arg1 === 'help' || arg1 === '--help' || arg1 === '-h') {
    printHelp();
    process.exit(0);
  }

  if (arg1 === 'settings') {
    console.log(`
⚙️  Current Settings:
  - LLM Endpoint: http://localhost:11434/api/generate
  - LLM Model: qwen2.5-coder
  - Output Directory: output/
  - Supported Extensions: ${SUPPORTED_EXTENSIONS.join(', ')}
  - Max File Size: ${MAX_FILE_SIZE / 1024}KB
`);
    process.exit(0);
  }

  const filePath = arg1;
  const action = arg2;

  // 1. Validate arguments
  if (!filePath || !action) {
    console.error('Error: Missing arguments.');
    printHelp();
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);

  // 2. Read file content
  let code: string = '';
  if (!['scan-and-chunk', 'chunk-all', 'validate-report'].includes(action.toLowerCase())) {
    try {
      code = fs.readFileSync(absolutePath, 'utf-8');
    } catch (error) {
      console.error(`Error: Could not read file at ${absolutePath}`);
      process.exit(1);
    }
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
        // console.log(JSON.stringify(response, null, 2));
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

    case 'scan-and-chunk': {
      console.log(`\n📂 Scanning directory: ${absolutePath}...`);
      const files = scanDirectory(absolutePath, absolutePath);
      console.log(`✅ Scanned ${files.length} valid files.`);

      console.log(`\n📦 Chunking scanned files...`);
      const uniqueChunks = new Map<string, any>();

      for (const file of files) {
        const chunks = chunkFile(file);

        chunks.forEach((chunk: any) => {
          const hash = generateHash(chunk.content);
          if (!uniqueChunks.has(hash)) {
            uniqueChunks.set(hash, { id: hash, file: file.path, ...chunk, hash });
          }
        });
      }

      const finalChunks = Array.from(uniqueChunks.values());
      const outputDir = path.resolve('output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      
      // Save intermediate scan results (optional but helpful for logs)
      fs.writeFileSync(path.join(outputDir, 'scan-result.json'), JSON.stringify({ projectRoot: absolutePath, totalFiles: files.length, files }, null, 2));
      
      // Save chunks
      const outputPath = path.join(outputDir, 'chunks.json');
      fs.writeFileSync(outputPath, JSON.stringify({ chunks: finalChunks }, null, 2));
      console.log(`✅ Scan and chunk complete. ${finalChunks.length} unique chunks saved to output/chunks.json\n`);
      break;
    }

    case 'analyze': {
      console.log(`\n🔍 Analyzing for code smells in ${path.basename(absolutePath)}...`);
      const analyzer = new StaticAnalyzer();
      const smells = analyzer.analyze(absolutePath, code);

      if (smells.length === 0) {
        console.log('✅ No code smells detected.');
      } else {
        console.log(`🚨 Found ${smells.length} code smell(s):`);
        smells.forEach(smell => {
          console.log(`- [${smell.type}] at line ${smell.location.start.line + 1}: ${smell.message}`);
        });
      }
      console.log('');
      break;
    }

    case 'security-scan': {
      console.log(`\n🛡️  Running Security Scan on ${path.basename(absolutePath)}...`);
      const securityScanner = new SecurityScanner();
      const vulns = securityScanner.scan(absolutePath, code);

      if (vulns.length === 0) {
        console.log('✅ No security vulnerabilities detected.');
      } else {
        console.log(`🚨 Found ${vulns.length} vulnerability(ies):`);
        vulns.forEach(vuln => {
          console.log(`- [${vuln.severity}] [${vuln.type}] at line ${vuln.location.line + 1}: ${vuln.message}`);
        });
      }
      console.log('');
      break;
    }

    case 'validate-report': {
      console.log(`\n📂 Scanning directory for validation: ${absolutePath}...`);
      const files = scanDirectory(absolutePath, absolutePath);
      console.log(`✅ Scanned ${files.length} valid files.`);

      const analyzer = new StaticAnalyzer();
      const securityScanner = new SecurityScanner();
      const report = {
        scannedFiles: files.length,
        totalSmells: 0,
        totalVulnerabilities: 0,
        smells: [] as any[],
        vulnerabilities: [] as any[]
      };

      for (const file of files) {
        const smells = analyzer.analyze(file.path, file.content);
        if (smells.length > 0) {
          report.totalSmells += smells.length;
          report.smells.push(...smells);
        }

        const vulns = securityScanner.scan(file.path, file.content);
        if (vulns.length > 0) {
          report.totalVulnerabilities += vulns.length;
          report.vulnerabilities.push(...vulns);
        }
      }

      const outputDir = path.resolve('output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      const reportPath = path.join(outputDir, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n✅ Validation complete. Found ${report.totalSmells} code smells & ${report.totalVulnerabilities} security vulnerabilities.`);
      console.log(`📄 Report saved to: output/validation-report.json\n`);
      break;
    }

    default:
      console.error(`Error: Invalid action "${action}". Type "ts-node src/index.ts help" for a list of actions.`);
      process.exit(1);
  }
}

run();