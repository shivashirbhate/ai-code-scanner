import * as ts from 'typescript';

export interface SecurityVulnerability {
  type: 'HardcodedSecret' | 'SQLInjection' | 'UnsafeAPI' | 'XSS';
  severity: 'High' | 'Medium' | 'Low';
  file: string;
  location: { line: number; character: number };
  message: string;
}

export class SecurityScanner {
  public scan(filePath: string, code: string): SecurityVulnerability[] {
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
    const vulnerabilities: SecurityVulnerability[] = [];

    // 1. Regex-based secret scanning
    vulnerabilities.push(...this.detectSecrets(filePath, code));

    // 2. AST-based structural scanning
    const visit = (node: ts.Node) => {
      // Unsafe APIs & Basic XSS calls
      if (ts.isCallExpression(node)) {
        const exprText = node.expression.getText(sourceFile);
        if (exprText === 'eval') {
          vulnerabilities.push(this.createVuln('UnsafeAPI', 'High', filePath, sourceFile, node, `Use of unsafe API 'eval()'`));
        } else if (exprText === 'document.write' || exprText === 'document.writeln') {
          vulnerabilities.push(this.createVuln('XSS', 'Medium', filePath, sourceFile, node, `Use of unsafe API '${exprText}()' can lead to XSS`));
        } else if (exprText === 'setTimeout' || exprText === 'setInterval') {
          const firstArg = node.arguments[0];
          if (firstArg && ts.isStringLiteral(firstArg)) {
            vulnerabilities.push(this.createVuln('UnsafeAPI', 'High', filePath, sourceFile, node, `'${exprText}' with a string argument acts like eval()`));
          }
        }
      }

      // XSS via DOM assignment (innerHTML, outerHTML)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isPropertyAccessExpression(node.left)) {
          const propName = node.left.name.text;
          if (propName === 'innerHTML' || propName === 'outerHTML') {
            vulnerabilities.push(this.createVuln('XSS', 'High', filePath, sourceFile, node, `Potential XSS vulnerability via '${propName}' assignment`));
          }
        }
      }

      // SQL Injection Patterns (String concatenation or template expressions building queries)
      if (ts.isTemplateExpression(node)) {
        const text = node.getText(sourceFile).toUpperCase();
        if (/(SELECT|INSERT|UPDATE|DELETE)\s/i.test(text) && /(FROM|INTO|SET)\s/i.test(text)) {
          vulnerabilities.push(this.createVuln('SQLInjection', 'High', filePath, sourceFile, node, `Potential SQL Injection via unparameterized template string`));
        }
      } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        if (ts.isStringLiteral(node.left) || ts.isStringLiteral(node.right)) {
          const text = node.getText(sourceFile).toUpperCase();
          if (/(SELECT|INSERT|UPDATE|DELETE)\s/i.test(text) && /(FROM|INTO|SET)\s/i.test(text)) {
            vulnerabilities.push(this.createVuln('SQLInjection', 'High', filePath, sourceFile, node, `Potential SQL Injection via string concatenation`));
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return vulnerabilities;
  }

  private createVuln(type: SecurityVulnerability['type'], severity: SecurityVulnerability['severity'], file: string, sourceFile: ts.SourceFile, node: ts.Node, message: string): SecurityVulnerability {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return { type, severity, file, location: start, message };
  }

  private detectSecrets(filePath: string, code: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = code.split('\n');

    const secretRegexes = [
      { regex: /(?:api[_-]?key|token|secret|password|auth)[\s]*[:=][\s]*['"]([a-zA-Z0-9_\-]{16,})['"]/i, message: 'Potential hardcoded API Key or Secret' },
      { regex: /['"](eyJ[a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+)['"]/, message: 'Hardcoded JWT token found' },
      { regex: /['"](?:sk-[a-zA-Z0-9]{32,})['"]/, message: 'Potential hardcoded OpenAI API Key (sk-...)' },
      { regex: /['"](?:AKIA[a-zA-Z0-9]{16})['"]/, message: 'Potential AWS Access Key' },
    ];

    lines.forEach((line, index) => {
      for (const pattern of secretRegexes) {
        const match = line.search(pattern.regex);
        if (match !== -1) {
          vulnerabilities.push({ type: 'HardcodedSecret', severity: 'High', file: filePath, location: { line: index, character: match }, message: pattern.message });
        }
      }
    });

    return vulnerabilities;
  }
}