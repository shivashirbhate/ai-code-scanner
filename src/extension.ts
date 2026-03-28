import * as vscode from 'vscode';
import { CodeAnalyzer } from './scanner/codeAnalyzer';
import { PromptBuilder } from './ai/promptBuilder';
import { LLMClient } from './ai/llmClient';

export function activate(context: vscode.ExtensionContext) {
  const analyzer = new CodeAnalyzer();
  const llmClient = new LLMClient();

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
    const dependencies = analyzer.getDependencies(code);
    const isEntry = analyzer.isEntryPoint(fileName, code);

    const outputPanel = vscode.window.createOutputChannel('AI Code Scanner');
    outputPanel.show();
    outputPanel.appendLine(`--- Code Understanding ---`);
    outputPanel.appendLine(`File: ${fileName}`);
    outputPanel.appendLine(`Entry Point: ${isEntry ? 'Yes' : 'No'}`);
    outputPanel.appendLine(`Dependencies: ${dependencies.length > 0 ? dependencies.join(', ') : 'None'}`);
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