import * as vscode from 'vscode';
import axios from 'axios';

export interface LLMConfig {
  provider: 'ollama' | 'chatgpt';
  ollama: {
    url: string;
    model: string;
    timeout: number;
  };
  chatgpt: {
    apiKey: string;
    model: string;
  };
}

export class LLMSettingsManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('aiScanner');
  }

  getConfig(): LLMConfig {
    return {
      provider: this.config.get('provider', 'ollama'),
      ollama: {
        url: this.config.get('ollama.url', 'http://localhost:11434'),
        model: this.config.get('ollama.model', 'qwen2.5-coder'),
        timeout: this.config.get('ollama.timeout', 30000)
      },
      chatgpt: {
        apiKey: this.config.get('chatgpt.apiKey', ''),
        model: this.config.get('chatgpt.model', 'gpt-4-turbo')
      }
    };
  }

  private async tryOllamaEndpoint(url: string, path: string): Promise<any> {
    const endpoint = `${url.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    return axios.get(endpoint, {
      timeout: 5000
    });
  }

  async testOllamaConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const models = await this.fetchOllamaModels(url);
      if (models.length > 0) {
        return {
          success: true,
          message: `✅ Connected! Found ${models.length} model(s)`
        };
      }

      return {
        success: false,
        message: '❌ Connected to Ollama, but no models were found.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Connection failed: ${error.message}`
      };
    }
  }

  async fetchOllamaModels(url: string): Promise<string[]> {
    const endpoints = ['api/models', 'models', 'api/tags'];

    for (const endpoint of endpoints) {
      try {
        const response = await this.tryOllamaEndpoint(url, endpoint);
        const data = response.data;

        if (Array.isArray(data)) {
          return data.map((item: any) => (typeof item === 'string' ? item : item.name)).filter(Boolean);
        }

        if (data.models && Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name).filter(Boolean);
        }

        if (data.model && typeof data.model === 'string') {
          return [data.model];
        }
      } catch {
        continue;
      }
    }

    return [];
  }

  async validateChatGPTKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          success: true,
          message: '✅ ChatGPT API key is valid'
        };
      }

      return {
        success: false,
        message: '❌ Invalid API key'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `❌ API validation failed: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }

  async updateOllamaModel(model: string): Promise<void> {
    await this.config.update('ollama.model', model, vscode.ConfigurationTarget.Global);
  }

  async updateOllamaUrl(url: string): Promise<void> {
    await this.config.update('ollama.url', url, vscode.ConfigurationTarget.Global);
  }

  async updateChatGPTKey(apiKey: string): Promise<void> {
    await this.config.update('chatgpt.apiKey', apiKey, vscode.ConfigurationTarget.Global);
  }

  async updateProvider(provider: 'ollama' | 'chatgpt'): Promise<void> {
    await this.config.update('provider', provider, vscode.ConfigurationTarget.Global);
  }
}

export async function configureLLMProvider(): Promise<void> {
  const settingsManager = new LLMSettingsManager();
  const config = settingsManager.getConfig();

  const provider = await vscode.window.showQuickPick([
    { label: 'Ollama (Local)', value: 'ollama', detail: 'Use a local Ollama instance' },
    { label: 'ChatGPT (API)', value: 'chatgpt', detail: 'Use OpenAI ChatGPT API' }
  ], {
    placeHolder: 'Select LLM Provider',
    canPickMany: false
  });

  if (!provider) return;

  if (provider.value === 'ollama') {
    // ========== OLLAMA CONFIGURATION ==========
    const url = await vscode.window.showInputBox({
      placeHolder: 'http://localhost:11434',
      value: config.ollama.url,
      prompt: 'Enter Ollama server URL'
    });

    if (!url) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Testing Ollama connection...',
      cancellable: false
    }, async () => {
      const result = await settingsManager.testOllamaConnection(url);
      
      if (result.success) {
        await settingsManager.updateOllamaUrl(url);

        // Fetch and display available models (no default)
        const models = await settingsManager.fetchOllamaModels(url);
        if (models.length > 0) {
          const selectedModel = await vscode.window.showQuickPick(
            models.map(m => ({ label: m, value: m })),
            {
              placeHolder: 'Select a model (no default selected)',
              canPickMany: false
            }
          );

          if (selectedModel) {
            await settingsManager.updateOllamaModel(selectedModel.value);
            await settingsManager.updateProvider('ollama');
            vscode.window.showInformationMessage(`✅ Ollama configured with model: ${selectedModel.value}`);
          } else {
            vscode.window.showWarningMessage('⚠️ No model selected. Configuration cancelled.');
          }
        } else {
          vscode.window.showWarningMessage('⚠️ No models found on Ollama server. Check your connection.');
        }
      } else {
        vscode.window.showErrorMessage(result.message);
      }
    });
  } else {
    // ========== CHATGPT CONFIGURATION ==========
    const apiKey = await vscode.window.showInputBox({
      placeHolder: 'sk-...',
      value: config.chatgpt.apiKey,
      prompt: 'Enter OpenAI API Key',
      password: true
    });

    if (!apiKey) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Validating ChatGPT API key...',
      cancellable: false
    }, async () => {
      const result = await settingsManager.validateChatGPTKey(apiKey);
      
      if (result.success) {
        // Select model
        const chatGptModels = [
          { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
          { label: 'GPT-4', value: 'gpt-4' },
          { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
        ];

        const selectedModel = await vscode.window.showQuickPick(chatGptModels, {
          placeHolder: 'Select ChatGPT model',
          canPickMany: false
        });

        if (selectedModel) {
          await settingsManager.updateChatGPTKey(apiKey);
          await vscode.workspace.getConfiguration('aiScanner').update(
            'chatgpt.model',
            selectedModel.value,
            vscode.ConfigurationTarget.Global
          );
          await settingsManager.updateProvider('chatgpt');
          vscode.window.showInformationMessage(`✅ ChatGPT configured with model: ${selectedModel.label}`);
        }
      } else {
        vscode.window.showErrorMessage(result.message);
      }
    });
  }
}