import fs from 'fs';
import path from 'path';

export function generateDocs(scanResultPath: string): void {
  const scanData = JSON.parse(fs.readFileSync(scanResultPath, 'utf-8'));

  if (!scanData.files || !Array.isArray(scanData.files)) {
    throw new Error('Invalid scan-result.json: missing files array');
  }

  // Ensure output directory exists
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate folder structure markdown
  const tree = buildFolderTree(scanData.files);
  const mdContent = `# Project Folder Structure\n\n\`\`\`\n${generateMarkdownTree(tree)}\`\`\`\n`;
  fs.writeFileSync(path.join(outputDir, 'folder-structure.md'), mdContent);

  // Generate logical tree JSON
  const logicalTree = buildLogicalTree(scanData);
  fs.writeFileSync(path.join(outputDir, 'project-logical-tree.json'), JSON.stringify(logicalTree, null, 2));
}

function buildFolderTree(files: any[]): any {
  const tree: any = {};

  for (const file of files) {
    const parts = file.path.split(/[\\\/]+/);
    let current = tree;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  return tree;
}

function generateMarkdownTree(tree: Record<string, any>, prefix = '', isLast = true): string {
  let result = '';
  const keys = Object.keys(tree).sort(); // Sort for consistent output

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const isLastItem = i === keys.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    result += prefix + connector + key + '\n';

    const child = tree[key];
    if (child && typeof child === 'object' && Object.keys(child).length > 0) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      result += generateMarkdownTree(child as Record<string, any>, newPrefix, isLastItem);
    }
  }

  return result;
}

function buildLogicalTree(scanData: any): any {
  const tree: any = {
    name: 'Project',
    type: 'project',
    root: scanData.projectRoot || 'unknown',
    totalFiles: scanData.totalFiles || 0,
    description: 'Project structure and component analysis',
    structure: {}
  };

  let current = tree.structure;

  for (const file of scanData.files) {
    const parts = file.path.split(/[\\\/]+/);
    current = tree.structure; // Reset to root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        // File
        current[part] = {
          type: 'file',
          extension: file.extension,
          size: file.size,
          description: generateDescription(file)
        };
      } else {
        // Directory
        if (!current[part]) {
          current[part] = {
            type: 'directory',
            description: generateDirectoryDescription(part),
            children: {}
          };
        }
        current = current[part].children;
      }
    }
  }

  return tree;
}

function generateDescription(file: any): string {
  const name = path.basename(file.path, file.extension);
  const content = file.content;

  if (file.extension === '.ts') {
    if (content.includes('@Component')) {
      // Extract component selector and class name
      const selectorMatch = content.match(/selector:\s*['"`]([^'"`]+)['"`]/);
      const classMatch = content.match(/export class (\w+)/);
      const selector = selectorMatch ? selectorMatch[1] : 'unknown';
      const className = classMatch ? classMatch[1] : name;
      return `Angular component: ${className} (${selector})`;
    } else if (content.includes('export class')) {
      const classMatch = content.match(/export class (\w+)/);
      const className = classMatch ? classMatch[1] : name;
      return `TypeScript class: ${className}`;
    } else if (content.includes('export interface')) {
      const interfaceMatch = content.match(/export interface (\w+)/);
      const interfaceName = interfaceMatch ? interfaceMatch[1] : name;
      return `TypeScript interface: ${interfaceName}`;
    }
  }

  return `File: ${name}${file.extension}`;
}

function generateDirectoryDescription(dirName: string): string {
  const descriptions: { [key: string]: string } = {
    'src': 'Source code directory',
    'components': 'Angular components organized by feature',
    'services': 'Angular services for business logic',
    'utils': 'Utility functions and helpers',
    'types': 'TypeScript type definitions',
    'ai': 'AI and LLM related functionality',
    'chunker': 'Code chunking utilities',
    'scanner': 'File scanning and analysis tools',
    'output': 'Generated output files'
  };

  return descriptions[dirName] || `Directory: ${dirName}`;
}