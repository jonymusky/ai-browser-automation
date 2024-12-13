import { AIAttemptContext } from '../types';

export interface LLMProviderInterface {
  generateAction(
    description: string,
    pageContent: string,
    visibleElements: Array<{
      tag: string;
      text: string;
      attributes: Record<string, string>;
    }>,
    context?: AIAttemptContext
  ): Promise<{
    action: string;
    selector?: string;
    value?: string;
    timeout?: number;
  }>;
}
