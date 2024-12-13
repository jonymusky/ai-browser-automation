export interface LLMProviderInterface {
  generateAction(
    description: string,
    pageContent: string,
    visibleElements: any[],
    context?: AIAttemptContext
  ): Promise<{
    action: string;
    selector?: string;
    value?: string;
  }>;
} 