export interface LLMProviderInterface {
  generateAction(
    prompt: string, 
    pageContent: string, 
    visibleElements: Array<{tag: string, text: string, attributes: Record<string, string>}>
  ): Promise<{
    action: string;
    selector?: string;
    value?: string;
  }>;
} 