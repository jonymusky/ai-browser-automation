export type LLMProvider = 'OpenAI' | 'Ollama';

export interface AutomationConfig {
  llmProvider: LLMProvider;
  apiKey?: string;
  screenshotOnComplete: boolean;
  browser: 'chrome' | 'firefox' | 'safari';
  headless: boolean;
  screenshotPath?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  getLLMProvider?: (config: AutomationConfig) => LLMProviderInterface;
}

export interface AutomationStep {
  action: 'navigate' | 'click' | 'write' | 'submit' | 'wait' | 'scroll' | 'navigate_page' | 'extract';
  description: string;
  solve_with_ai?: boolean;
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
}

export interface AutomationResult {
  success: boolean;
  data?: any;
  screenshot?: string;
  error?: string;
}

export interface ExecutionConfig {
  screenshotName?: string;
  // Podemos agregar más opciones en el futuro
} 