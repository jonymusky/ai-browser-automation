import { LLMProviderInterface } from '../providers/llm-provider.interface';

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
  maxAiAttempts?: number;
  aiRetryDelay?: number;
}

export interface AutomationStep {
  action:
    | 'navigate'
    | 'click'
    | 'write'
    | 'submit'
    | 'wait'
    | 'scroll'
    | 'navigate_page'
    | 'extract';
  description: string;
  solve_with_ai?: boolean;
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
}

export interface AutomationResult {
  success: boolean;
  data?: unknown;
  screenshot?: string;
  error?: string;
}

export interface ExecutionConfig {
  screenshotName?: string;
  // Podemos agregar más opciones en el futuro
}

export interface AIAttemptContext {
  previousAttempts: Array<{
    selector: string;
    error: string;
  }>;
  visibleElements: Array<{
    tag: string;
    text: string;
    attributes: Record<string, string>;
  }>;
  searchStrategies?: Array<{
    type: 'text' | 'aria-label' | 'title' | 'class' | 'data-testid';
    value?: string;
    contains?: string;
  }>;
}
