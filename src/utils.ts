import { AutomationConfig } from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { GrokProvider } from './providers/grok-provider';

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
    case 'Grok':
      if (!config.apiKey) throw new Error('Grok API key is required');
      return new GrokProvider({
        apiKey: config.apiKey,
        model: config.grokModel
      });
    default:
      throw new Error(`Unsupported LLM provider: ${config.llmProvider}`);
  }
}
