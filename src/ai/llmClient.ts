import axios from 'axios';

export class LLMClient {
  private endpoint = 'http://ollama:11434/api/generate';
  private model = 'gemma3:12b';

  public async ask(prompt: string): Promise<any> {
    try {
      const response = await axios.post(this.endpoint, {
        model: this.model,
        prompt: prompt,
        stream: false
      });

      console.log('LLM Response:', response.data);

      return response.data.response;
    } catch (error: any) {
      console.error('LLM Request failed:', error);

      if (error.response) {
        console.error('Response Error:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error:', error.message);
      }

      // throw new Error('Failed to communicate with local LLM. Is Ollama running?');
    }
  }
}