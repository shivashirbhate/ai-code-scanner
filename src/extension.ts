import * as vscode from 'vscode';
import { CodeAnalyzer } from './scanner/codeAnalyzer';
import { PromptBuilder } from './ai/promptBuilder';
import { LLMClient } from './ai/llmClient';
import { StaticAnalyzer } from './scanner/staticAnalyzer';
import { SecurityScanner } from './scanner/securityScanner';

export function activate(context: vscode.ExtensionContext) {
  const codeAnalyzer = new CodeAnalyzer();
  const llmClient = new LLMClient();
  const staticAnalyzer = new StaticAnalyzer();
  const securityScanner = new SecurityScanner();

  const disposable = vscode.commands.registerCommand('aiScanner.scan', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active file open to scan.');
      return;
    }

    const document = editor.document;
    const code = document.getText();
    const fileName = document.fileName;

    vscode.window.showInformationMessage('Starting AI Code Analysis...');

    // 1. Static Analysis
    const dependencies = codeAnalyzer.getDependencies(code);
    const isEntry = codeAnalyzer.isEntryPoint(fileName, code);
    const codeSmells = staticAnalyzer.analyze(fileName, code);
    const securityVulnerabilities = securityScanner.scan(fileName, code);

    const outputPanel = vscode.window.createOutputChannel('AI Code Scanner');
    outputPanel.show();
    outputPanel.appendLine(`--- Code Understanding ---`);
    outputPanel.appendLine(`File: ${fileName}`);
    outputPanel.appendLine(`Entry Point: ${isEntry ? 'Yes' : 'No'}`);
    outputPanel.appendLine(`Dependencies: ${dependencies.length > 0 ? dependencies.join(', ') : 'None'}`);

    outputPanel.appendLine(`\n--- Static Analysis (Code Smells) ---`);
    if (codeSmells.length === 0) {
      outputPanel.appendLine('✅ No code smells detected.');
    } else {
      outputPanel.appendLine(`🚨 Found ${codeSmells.length} code smell(s):`);
      codeSmells.forEach(smell => {
        outputPanel.appendLine(`- [${smell.type}] at line ${smell.location.start.line + 1}: ${smell.message}`);
      });
    }

    outputPanel.appendLine(`\n--- Security Scanner ---`);
    if (securityVulnerabilities.length === 0) {
      outputPanel.appendLine('✅ No security vulnerabilities detected.');
    } else {
      outputPanel.appendLine(`🚨 Found ${securityVulnerabilities.length} vulnerability(ies):`);
      securityVulnerabilities.forEach(vuln => {
        outputPanel.appendLine(`- [${vuln.severity}][${vuln.type}] at line ${vuln.location.line + 1}: ${vuln.message}`);
      });
    }
    outputPanel.appendLine(`--------------------------\n`);

    // 2. LLM Analysis Selection
    const action = await vscode.window.showQuickPick([
      'Explain Code',
      'Trace Execution Flow'
    ], { placeHolder: 'Select an AI feature:' });

    if (!action) return;

    outputPanel.appendLine(`Running ${action} via Local LLM...`);

    try {
      const prompt = action === 'Explain Code' 
        ? PromptBuilder.explainCode(code) 
        : PromptBuilder.traceExecution(code);

      const response = await llmClient.ask(prompt);
      outputPanel.appendLine(`\n--- AI Response ---`);
      outputPanel.appendLine(response);
      
    } catch (error: any) {
      vscode.window.showErrorMessage(error.message);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}