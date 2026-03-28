export class PromptBuilder {
  /**
   * Explain code (functions, classes, files)
   */
  public static explainCode(code: string): string {
    return `You are a world-class code analyzer. Please explain the following code snippet. 
Detail its core functionality, responsibilities, and any notable design patterns used.

Code:
\`\`\`
${code}
\`\`\`
`;
  }

  /**
   * Trace execution flow
   */
  public static traceExecution(code: string): string {
    return `Trace the execution flow of the following code.
Explain the step-by-step logical sequence from start to finish. Include side effects, state changes, and primary control flows.

Code:
\`\`\`
${code}
\`\`\`
`;
  }
}