import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { CodeAnalyzer } from './scanner/codeAnalyzer';
import { PromptBuilder } from './ai/promptBuilder';
import { LLMClient } from './ai/llmClient';
import { StaticAnalyzer } from './scanner/staticAnalyzer';
import { SecurityScanner } from './scanner/securityScanner';
import { generateDocs } from './utils/docGenerator';
import { configureLLMProvider } from './ai/llmSettings';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('AI Code Scanner');

  const codeAnalyzer = new CodeAnalyzer();
  const llmClient = new LLMClient();
  const staticAnalyzer = new StaticAnalyzer();
  const securityScanner = new SecurityScanner();

  // Main scan command
  const scanCommand = vscode.commands.registerCommand('aiScanner.scan', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active file open to scan.');
      return;
    }

    const document = editor.document;
    const code = document.getText();
    const fileName = document.fileName;

    outputChannel.show();
    outputChannel.appendLine(`🔍 Starting AI Code Analysis for: ${path.basename(fileName)}`);
    outputChannel.appendLine('=' .repeat(50));

    try {
      // 1. Basic Analysis
      const dependencies = codeAnalyzer.getDependencies(code);
      const isEntry = codeAnalyzer.isEntryPoint(fileName, code);

      outputChannel.appendLine(`📁 File: ${fileName}`);
      outputChannel.appendLine(`🎯 Entry Point: ${isEntry ? 'Yes' : 'No'}`);
      outputChannel.appendLine(`📦 Dependencies: ${dependencies.length > 0 ? dependencies.join(', ') : 'None'}`);

      // 2. Static Analysis
      const codeSmells = staticAnalyzer.analyze(fileName, code);
      outputChannel.appendLine(`\n🔧 Static Analysis (Code Smells):`);
      if (codeSmells.length === 0) {
        outputChannel.appendLine('✅ No code smells detected.');
      } else {
        outputChannel.appendLine(`🚨 Found ${codeSmells.length} code smell(s):`);
        codeSmells.forEach(smell => {
          outputChannel.appendLine(`  - [${smell.type}] Line ${smell.location.start.line + 1}: ${smell.message}`);
        });
      }

      // 3. Security Scan
      const securityVulnerabilities = securityScanner.scan(fileName, code);
      outputChannel.appendLine(`\n🛡️ Security Scanner:`);
      if (securityVulnerabilities.length === 0) {
        outputChannel.appendLine('✅ No security vulnerabilities detected.');
      } else {
        outputChannel.appendLine(`🚨 Found ${securityVulnerabilities.length} vulnerability(ies):`);
        securityVulnerabilities.forEach(vuln => {
          outputChannel.appendLine(`  - [${vuln.severity}][${vuln.type}] Line ${vuln.location.line + 1}: ${vuln.message}`);
        });
      }

      // 4. AI Analysis Options
      const action = await vscode.window.showQuickPick([
        'Explain Code',
        'Trace Execution Flow',
        'Skip AI Analysis'
      ], { placeHolder: 'Select AI analysis option:' });

      if (action && action !== 'Skip AI Analysis') {
        outputChannel.appendLine(`\n🤖 Running ${action} via Local LLM...`);

        const prompt = action === 'Explain Code'
          ? PromptBuilder.explainCode(code)
          : PromptBuilder.traceExecution(code);

        const response = await llmClient.ask(prompt);
        outputChannel.appendLine('\n📝 AI Response:');
        outputChannel.appendLine('-'.repeat(30));
        outputChannel.appendLine(response);
      }

      outputChannel.appendLine('\n' + '='.repeat(50));
      outputChannel.appendLine('✅ Analysis Complete');

    } catch (error: any) {
      vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
      outputChannel.appendLine(`❌ Error: ${error.message}`);
    }
  });

  // Analyze command (code smells only)
  const analyzeCommand = vscode.commands.registerCommand('aiScanner.analyze', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active file open to analyze.');
      return;
    }

    const document = editor.document;
    const code = document.getText();
    const fileName = document.fileName;

    outputChannel.show();
    outputChannel.appendLine(`🔍 Analyzing ${path.basename(fileName)} for code smells...`);

    try {
      const analyzer = new StaticAnalyzer();
      const smells = analyzer.analyze(fileName, code);

      if (smells.length === 0) {
        outputChannel.appendLine('✅ No code smells detected.');
        vscode.window.showInformationMessage('No code smells found!');
      } else {
        outputChannel.appendLine(`🚨 Found ${smells.length} code smell(s):`);
        smells.forEach(smell => {
          outputChannel.appendLine(`- [${smell.type}] Line ${smell.location.start.line + 1}: ${smell.message}`);
        });
        vscode.window.showWarningMessage(`Found ${smells.length} code smell(s)`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
  });

  // Security scan command
  const securityScanCommand = vscode.commands.registerCommand('aiScanner.securityScan', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active file open to scan.');
      return;
    }

    const document = editor.document;
    const code = document.getText();
    const fileName = document.fileName;

    outputChannel.show();
    outputChannel.appendLine(`🛡️ Running Security Scan on ${path.basename(fileName)}...`);

    try {
      const scanner = new SecurityScanner();
      const vulns = scanner.scan(fileName, code);

      if (vulns.length === 0) {
        outputChannel.appendLine('✅ No security vulnerabilities detected.');
        vscode.window.showInformationMessage('Security scan passed!');
      } else {
        outputChannel.appendLine(`🚨 Found ${vulns.length} vulnerability(ies):`);
        vulns.forEach(vuln => {
          outputChannel.appendLine(`- [${vuln.severity}][${vuln.type}] Line ${vuln.location.line + 1}: ${vuln.message}`);
        });
        vscode.window.showErrorMessage(`Found ${vulns.length} security vulnerabilities`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Security scan failed: ${error.message}`);
    }
  });

  // Generate docs command
  const generateDocsCommand = vscode.commands.registerCommand('aiScanner.generateDocs', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No scan-result.json file open.');
      return;
    }

    const document = editor.document;
    const fileName = document.fileName;

    if (!fileName.includes('scan-result.json')) {
      vscode.window.showErrorMessage('Please open a scan-result.json file first.');
      return;
    }

    outputChannel.show();
    outputChannel.appendLine(`📄 Generating documentation from ${path.basename(fileName)}...`);

    try {
      generateDocs(fileName);
      outputChannel.appendLine('✅ Documentation generated successfully.');
      outputChannel.appendLine('📄 Files created: output/folder-structure.md, output/project-logical-tree.json');

      // Show success message with option to open files
      const openFolderStructure = await vscode.window.showInformationMessage(
        'Documentation generated successfully!',
        'Open Folder Structure',
        'Open Logical Tree'
      );

      if (openFolderStructure === 'Open Folder Structure') {
        const folderStructureUri = vscode.Uri.file(path.join(path.dirname(fileName), 'output', 'folder-structure.md'));
        await vscode.workspace.openTextDocument(folderStructureUri);
        await vscode.window.showTextDocument(folderStructureUri);
      } else if (openFolderStructure === 'Open Logical Tree') {
        const logicalTreeUri = vscode.Uri.file(path.join(path.dirname(fileName), 'output', 'project-logical-tree.json'));
        await vscode.workspace.openTextDocument(logicalTreeUri);
        await vscode.window.showTextDocument(logicalTreeUri);
      }

    } catch (error: any) {
      vscode.window.showErrorMessage(`Documentation generation failed: ${error.message}`);
      outputChannel.appendLine(`❌ Error: ${error.message}`);
    }
  });

  // Configure LLM Provider command
  const configureLLMCommand = vscode.commands.registerCommand('aiScanner.configureLLM', async () => {
    outputChannel.show();
    outputChannel.appendLine('🔧 Opening LLM Provider Configuration...');
    await configureLLMProvider();
  });

  // Test Ollama Connection command
  const testOllamaCommand = vscode.commands.registerCommand('aiScanner.testOllamaConnection', async () => {
    const config = vscode.workspace.getConfiguration('aiScanner');
    const ollamaUrl = config.get('ollama.url', 'http://localhost:11434');

    outputChannel.show();
    outputChannel.appendLine(`🧪 Testing Ollama connection to ${ollamaUrl}...`);

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Testing Ollama connection...',
      cancellable: false
    }, async () => {
      try {
        const endpoints = ['api/models', 'models', 'api/tags'];
        let modelNames: string[] = [];

        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(`${ollamaUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`, { timeout: 5000 });
            const data = response.data;

            if (Array.isArray(data)) {
              modelNames = data.map((item: any) => (typeof item === 'string' ? item : item.name)).filter(Boolean);
            } else if (data.models && Array.isArray(data.models)) {
              modelNames = data.models.map((m: any) => m.name).filter(Boolean);
            } else if (data.model && typeof data.model === 'string') {
              modelNames = [data.model];
            }

            if (modelNames.length > 0) {
              break;
            }
          } catch {
            continue;
          }
        }

        if (modelNames.length > 0) {
          outputChannel.appendLine('✅ Connection successful!');
          outputChannel.appendLine(`📦 Available models: ${modelNames.join(', ')}`);

          const selectModel = await vscode.window.showQuickPick(modelNames, {
            placeHolder: 'Select a model to use'
          });

          if (selectModel) {
            await config.update('ollama.model', selectModel, vscode.ConfigurationTarget.Global);
            outputChannel.appendLine(`✅ Model set to: ${selectModel}`);
            vscode.window.showInformationMessage(`✅ Model updated to ${selectModel}`);
          }
        } else {
          vscode.window.showErrorMessage('❌ Invalid response from Ollama');
        }
      } catch (error: any) {
        const message = `❌ Connection failed: ${error.message}`;
        outputChannel.appendLine(message);
        vscode.window.showErrorMessage(message);
      }
    });
  });

  context.subscriptions.push(
    scanCommand,
    analyzeCommand,
    securityScanCommand,
    generateDocsCommand,
    configureLLMCommand,
    testOllamaCommand
  );
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}