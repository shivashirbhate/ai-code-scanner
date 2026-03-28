# AI Code Scanner (VS Code Extension)

A lightweight AI-powered code scanner built as a VS Code extension using Node.js and optional local LLMs (e.g., Qwen2.5-Coder).

---

CORE FEATURES

1. Code Understanding

* Explain code (functions, classes, files)
* Identify modules and dependencies
* Trace execution flow
* Detect entry points

2. Static Analysis (Rule-Based)

* Lint issues (custom or ESLint-based)
* Code smells:

  * Long functions
  * Duplicate code
  * Dead code
* Complexity analysis:

  * Cyclomatic complexity
  * Deep nesting

3. Security Scanner

* Detect SQL injection patterns
* Identify hardcoded secrets (API keys, tokens)
* Flag unsafe APIs
* Detect basic XSS/injection issues

4. Upgrade Suggestions

* Detect deprecated packages
* Suggest version upgrades
* Highlight breaking changes (basic level)

5. AI Suggestions (LLM-Based)

* Refactor code
* Improve performance
* Improve readability
* Suggest better coding patterns

---

INSTALLATION & SETUP STEPS

Step 1: Install Prerequisites

* Node.js (v18+)
* Visual Studio Code
* npm (comes with Node.js)
* Optional: Ollama (for local LLM)

---

Step 2: Create VS Code Extension

```bash
npm install -g yo generator-code
yo code
```

Select:

* TypeScript
* VS Code Extension

---

Step 3: Install Dependencies

```bash
npm install
```

Optional:

```bash
npm install eslint axios
```

---

Step 4: Project Structure

```plaintext
src/
  extension.ts
  scanner/
    codeAnalyzer.ts
    lintScanner.ts
    securityScanner.ts
    complexityAnalyzer.ts
  ai/
    llmClient.ts
    promptBuilder.ts
  utils/
    fileReader.ts
    parser.ts
```

---

Step 5: Add Command

In package.json:

```json
"contributes": {
  "commands": [
    {
      "command": "aiScanner.scan",
      "title": "Run AI Code Scanner"
    }
  ]
}
```

---

Step 6: Register Command

In extension.ts:

```ts
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('aiScanner.scan', async () => {
    vscode.window.showInformationMessage('Running AI Code Scanner...');
    // call scanner logic here
  });

  context.subscriptions.push(disposable);
}
```

---

Step 7: Run Extension

```bash
npm run compile
```

Then press:

```plaintext
F5
```

---

Step 8: Setup LLM (Optional)

```bash
ollama run qwen2.5-coder
```

API endpoint:

```plaintext
http://localhost:11434/api/generate
```

---

Step 9: Run Scanner

* Open any file in VS Code
* Press:

```plaintext
Ctrl + Shift + P
```

* Run:

```plaintext
Run AI Code Scanner
```

---

Step 10: Package Extension

```bash
npm install -g vsce
vsce package
```

---

Step 11: Install Extension

```bash
code --install-extension your-extension.vsix
```

---

FINAL RESULT

* VS Code extension ready
* Rule-based scanning working
* AI suggestions (if LLM connected)

---

If you want next step, I can give you:

* MVP working scanner code (very fast start)
* Best prompt design for LLM (this is critical)
* How to avoid heavy parsing tools and still get good results
