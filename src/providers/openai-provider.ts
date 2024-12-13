import OpenAI from 'openai';
import { LLMProviderInterface } from './llm-provider.interface';
import { AIAttemptContext } from '../types';

export class OpenAIProvider implements LLMProviderInterface {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateAction(
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
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a browser automation assistant. Based on the description and page content, determine the appropriate action to take.'
        },
        {
          role: 'user',
          content: `
            Task: ${description}
            
            Page Content: ${pageContent}
            
            Visible Elements: ${JSON.stringify(visibleElements, null, 2)}
            
            Return only a JSON object with the following structure:
            {
              "action": "click|write|wait|...",
              "selector": "CSS selector to target element",
              "value": "Value to input (if applicable)"
            }
          `
        }
      ]
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}
