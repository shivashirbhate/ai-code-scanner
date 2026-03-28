import axios from 'axios';

export class LLMClient {
  // Configuration for local LLM matching your README instructions
  private endpoint = 'http://localhost:11434/api/generate';
  private model = 'qwen2.5-coder';

  public async ask(prompt: string): Promise<string> {
    try {
      const response = await axios.post(this.endpoint, {
        model: this.model,
        prompt: prompt,
        stream: false
      });
      return response.data.response;
    } catch (error) {
      console.error('LLM Request failed:', error);
      throw new Error('Failed to communicate with local LLM. Is Ollama running?');
    }
  }
}