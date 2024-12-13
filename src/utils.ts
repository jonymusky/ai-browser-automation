import { AutomationConfig } from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { OllamaProvider } from './providers/ollama-provider';

export function getLLMProvider(config: AutomationConfig) {
  switch (config.llmProvider) {
    case 'OpenAI':
      if (!config.apiKey) throw new Error('OpenAI API key is required');
      return new OpenAIProvider(config.apiKey);
    case 'Ollama':
      return new OllamaProvider({
        ollamaBaseUrl: config.ollamaBaseUrl,
        ollamaModel: config.ollamaModel
      });
    default:
      throw new Error(`Unsupported LLM provider: ${config.llmProvider}`);
  }
} 