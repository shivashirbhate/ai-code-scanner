import axios from 'axios';
import { LLM_MODEL, LLM_URL } from '../utils/constants';

export class LLMClient {
  private endpoint = LLM_URL;
  private model = LLM_MODEL;

  public async ask(prompt: string): Promise<any> {
    try {
      // Make a POST request to the LLM endpoint with the prompt.
      const response = await axios.post(this.endpoint, {
        model: this.model,
        prompt: prompt,
        stream: false
      });

      console.log('LLM Response:', response.data);

      // Extract the response from the response data.
      return response.data.response;
    } catch (error: any) {
      console.error('LLM Request failed:', error);

      // Handle different types of errors.
      if (error.response) {
        // Log the error response data if a response was received.
        console.error('Response Error:', error.response.data);
      } else if (error.request) {
        // Log information about the request if no response was received.
        console.error('No response received:', error.request);
      } else {
        // Log the error message if it's a general error.
        console.error('Error:', error.message);
      }

      // The original code was commented out.  Rethrowing as an error to prevent silent failures.
      throw new Error('Failed to communicate with local LLM. Is Ollama running?');
    }
  }
}