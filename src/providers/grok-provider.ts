import { LLMProviderInterface } from './llm-provider.interface';
import { AIAttemptContext } from '../types';

interface GrokConfig {
  apiKey: string;
  model?: string;
}

export class GrokProvider implements LLMProviderInterface {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: GrokConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'grok-beta';
    this.baseURL = 'https://api.x.ai/v1';
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
  }> {
    const enhancedPrompt = `
      Context: ${context ? JSON.stringify(context) : 'No context provided'}
      Page Content Length: ${pageContent.length}
      Visible Elements: ${visibleElements.length}
      
      Task: ${description}

      You are a browser automation assistant. Generate a reliable selector that won't become stale.
      
      RULES:
      1. Respond ONLY with a JSON object
      2. Do not include any explanations or additional text
      3. Prefer stable selectors in this order:
         - id
         - data-testid
         - aria-label
         - name
         - unique class combinations
         - CSS path as last resort
      4. The JSON must have this exact structure:
      {
        "action": "write",
        "selector": "textarea[aria-label=\\"Buscar\\"] OR input[name=\\"q\\"]",
        "value": "OpenAI"
      }
      
      AVAILABLE ACTIONS:
      - write: Write text into an input field
      - submit: Submit a form
      - click: Click on an element
      - wait: Wait for some time

      Available elements: ${JSON.stringify(
        visibleElements.map((el) => ({
          tag: el.tag,
          text: el.text?.slice(0, 50), // Limit text length
          id: el.attributes.id,
          name: el.attributes.name,
          'aria-label': el.attributes['aria-label'],
          'data-testid': el.attributes['data-testid'],
          class: el.attributes.class
        }))
      )}
    `;

    try {
      const response = await this.generateResponse(enhancedPrompt);
      const parsedResponse = JSON.parse(response);

      // Validar que la respuesta tiene los campos necesarios
      if (
        !parsedResponse.selector &&
        ['write', 'click', 'submit'].includes(parsedResponse.action)
      ) {
        return this.getFallbackAction(description);
      }

      // Agregar un pequeño retraso para elementos dinámicos
      if (parsedResponse.action === 'click' || parsedResponse.action === 'write') {
        return {
          ...parsedResponse,
          timeout: 1000 // Agregar un pequeño timeout para elementos dinámicos
        };
      }

      return parsedResponse;
    } catch (error) {
      console.error('Failed to parse Grok response:', error);
      return this.getFallbackAction(description);
    }
  }

  private async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a browser automation assistant. Always respond with raw JSON only, no markdown formatting or explanation.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Clean up any markdown formatting
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? jsonMatch[0] : content;
    } catch (error) {
      throw new Error(`Failed to generate response from Grok: ${error}`);
    }
  }

  private getFallbackAction(prompt: string): {
    action: string;
    selector?: string;
    value?: string;
    timeout?: number;
  } {
    if (prompt.toLowerCase().includes('cookie') || prompt.toLowerCase().includes('consent')) {
      return {
        action: 'click',
        selector: [
          // Common cookie accept button selectors
          'button[id*="accept"]',
          'button[class*="accept"]',
          '[data-testid*="cookie-accept"]',
          '[aria-label*="accept cookies"]',
          '#cookie-accept',
          '.cookie-accept',
          // Common cookie banner buttons
          '[id*="cookie"] button',
          '[class*="cookie"] button',
          '[id*="consent"] button',
          '[class*="consent"] button',
          // Text-based selectors
          'button:contains("Accept")',
          'button:contains("Allow")',
          'button:contains("I Accept")',
          'button:contains("Got it")'
        ].join(', '),
        timeout: 2000 // Longer timeout for cookie banners that might be loading
      };
    }

    if (prompt.toLowerCase().includes('search') || prompt.toLowerCase().includes('write')) {
      return {
        action: 'write',
        selector:
          '#search, input[name="q"], textarea[aria-label="Buscar"], [data-testid="search-input"]',
        value: prompt.split('"')[1] || 'OpenAI',
        timeout: 1000
      };
    }
    if (prompt.toLowerCase().includes('submit')) {
      return {
        action: 'submit',
        selector: 'form[role="search"], form#search, button[type="submit"]',
        timeout: 1000
      };
    }
    return {
      action: 'wait',
      timeout: 500
    };
  }
}
