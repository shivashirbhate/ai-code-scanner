import * as ts from 'typescript';

export interface CodeSmell {
  type: 'LongFunction' | 'DeepNesting';
  file: string;
  location: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  functionName?: string;
}

export class StaticAnalyzer {
  public analyze(filePath: string, code: string): CodeSmell[] {
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
    const smells: CodeSmell[] = [];

    smells.push(...this.detectLongFunctions(sourceFile));
    smells.push(...this.detectDeepNesting(sourceFile));

    return smells;
  }

  private detectLongFunctions(sourceFile: ts.SourceFile, maxLines: number = 50): CodeSmell[] {
    const smells: CodeSmell[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        const body = node.body;
        if (body && body.kind === ts.SyntaxKind.Block) {
          const start = sourceFile.getLineAndCharacterOfPosition(body.getStart(sourceFile));
          const end = sourceFile.getLineAndCharacterOfPosition(body.getEnd());
          const lineCount = end.line - start.line;

          if (lineCount > maxLines) {
            const functionName = node.name ? node.name.getText(sourceFile) : 'anonymous';
            smells.push({
              type: 'LongFunction',
              file: sourceFile.fileName,
              functionName,
              location: { 
                start: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)), 
                end: sourceFile.getLineAndCharacterOfPosition(node.getEnd()) 
              },
              message: `Function '${functionName}' is too long (${lineCount} lines). Maximum allowed is ${maxLines}.`
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return smells;
  }

  private detectDeepNesting(sourceFile: ts.SourceFile, maxDepth: number = 4): CodeSmell[] {
    const smells: CodeSmell[] = [];

    const visit = (node: ts.Node, depth: number) => {
      let isNestingNode = false;
      if (
        ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isSwitchStatement(node) ||
        ts.isCatchClause(node) || ts.isConditionalExpression(node)
      ) {
        isNestingNode = true;
      } else if (ts.isIfStatement(node)) {
        // Don't count 'else if' as a new level of nesting
        if (!node.parent || !ts.isIfStatement(node.parent) || node.parent.elseStatement !== node) {
          isNestingNode = true;
        }
      }

      const currentDepth = isNestingNode ? depth + 1 : depth;

      if (currentDepth > maxDepth) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        smells.push({
          type: 'DeepNesting',
          file: sourceFile.fileName,
          location: { start, end },
          message: `Nesting depth of ${currentDepth} exceeds maximum of ${maxDepth}.`
        });
        // Avoid reporting children of an already-reported deep node by not recursing further
        return;
      }

      ts.forEachChild(node, child => visit(child, currentDepth));
    };

    visit(sourceFile, 0);
    return smells;
  }
}