import ts from 'typescript';

export class CodeAnalyzer {
  /**
   * Identify modules and dependencies by parsing imports and requires.
   */
  public getDependencies(code: string): string[] {
    const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
    const dependencies = new Set<string>();

    function visit(node: ts.Node) {
      // ES6 Imports
      if (ts.isImportDeclaration(node)) {
        const moduleName = node.moduleSpecifier.getText().replace(/['"]/g, '');
        dependencies.add(moduleName);
      }
      // CommonJS Requires
      else if (ts.isCallExpression(node) && node.expression.getText() === 'require') {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          dependencies.add(arg.text);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return Array.from(dependencies);
  }

  /**
   * Detect entry points using basic file name and content heuristics.
   */
  public isEntryPoint(fileName: string, code: string): boolean {
    const entryPointNames = ['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'extension.ts', 'server.ts'];
    const isEntryName = entryPointNames.some(name => fileName.toLowerCase().endsWith(name));
    
    // Common initialization patterns
    const entryPatterns = [
      'app.listen(',
      'export function activate(',
      'ReactDOM.render(',
      'bootstrapApplication('
    ];
    const hasEntryPattern = entryPatterns.some(pattern => code.includes(pattern));

    return isEntryName || hasEntryPattern;
  }
}