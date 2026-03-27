// src/chunker/tsChunker.ts

import ts from 'typescript';
import { Chunk, ChunkType } from '../types';

export function chunkTSFile(code: string): Chunk[] {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  );

  const chunks: Chunk[] = [];

  function createChunk(
    node: ts.Node,
    type: ChunkType,
    name?: string
  ): Chunk {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const base = {
      type,
      content: code.slice(node.getStart(), node.getEnd()),
      startLine: start.line,
      endLine: end.line
    };

    // ✅ exactOptionalPropertyTypes safe
    return name ? { ...base, name } : base;
  }

  function isInsideFunction(node: ts.Node): boolean {
    let parent = node.parent;

    while (parent) {
      if (
        ts.isFunctionDeclaration(parent) ||
        ts.isMethodDeclaration(parent)
      ) {
        return true;
      }
      parent = parent.parent;
    }

    return false;
  }

  function visit(node: ts.Node) {
    // avoid nested duplicates
    if (isInsideFunction(node)) return;

    // function declaration
    if (ts.isFunctionDeclaration(node) && node.name) {
      chunks.push(
        createChunk(node, 'function', node.name.getText())
      );
    }

    // variable function (arrow / function expression)
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((decl) => {
        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ) {
          chunks.push(
            createChunk(
              decl,
              'function',
              decl.name.getText()
            )
          );
        }
      });
    }

    // class
    if (ts.isClassDeclaration(node) && node.name) {
      chunks.push(
        createChunk(node, 'class', node.name.getText())
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // ✅ IMPORTANT (your missing return)
  return chunks;
}