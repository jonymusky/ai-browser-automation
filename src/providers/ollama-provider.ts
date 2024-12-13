import fetch from 'node-fetch';
import { LLMProviderInterface } from './llm-provider.interface';
import { AIAttemptContext } from '../types';

export class OllamaProvider implements LLMProviderInterface {
  private baseUrl: string;
  private model: string;

  constructor(config: { ollamaBaseUrl?: string; ollamaModel?: string }) {
    this.baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
    this.model = config.ollamaModel || 'llama2';
  }

  async generateAction(
    description: string,
    _pageContent: string,
    _visibleElements: Array<{
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
    console.log('Generating action for prompt:', description);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: `You are a browser automation assistant. I will give you a task, and you must respond with a JSON object that describes the action to take.

RULES:
1. Respond ONLY with a JSON object
2. Do not include any explanations or additional text
3. The JSON must have this exact structure:
{
  "action": "write",
  "selector": "textarea[aria-label=\\"Buscar\\"] OR input[name=\\"q\\"]",
  "value": "OpenAI"
}

TASK: ${description}

AVAILABLE ACTIONS:
- write: Write text into an input field
- submit: Submit a form
- click: Click on an element
- wait: Wait for some time

Example response:
{"action":"write","selector":"textarea[aria-label=\\"Buscar\\"]","value":"OpenAI"}

YOUR RESPONSE (JSON only):`,
        stream: false,
        temperature: 0.1 // Reducir la temperatura para respuestas más consistentes
      })
    });

    const data = await response.json();
    console.log('Raw Ollama response:', data.response);

    try {
      // Buscar el primer objeto JSON válido en la respuesta
      const jsonMatch = data.response.match(/\{[^]*\}/);
      if (!jsonMatch) {
        console.log('No JSON found in response, using fallback');
        return this.getFallbackAction(description);
      }

      const cleanedResponse = jsonMatch[0];
      console.log('Cleaned response:', cleanedResponse);

      const parsedResponse = JSON.parse(cleanedResponse);
      console.log('Parsed response:', parsedResponse);

      // Validar que la respuesta tiene los campos necesarios
      if (
        !parsedResponse.selector &&
        ['write', 'click', 'submit'].includes(parsedResponse.action)
      ) {
        console.log('Missing selector, falling back to default action');
        return this.getFallbackAction(description);
      }

      return parsedResponse;
    } catch (error) {
      console.error('Failed to parse Ollama response:', error);
      return this.getFallbackAction(description);
    }
  }

  private getFallbackAction(prompt: string): any {
    console.log('Using fallback action for prompt:', prompt);
    // Para búsqueda en Google
    if (prompt.toLowerCase().includes('search') || prompt.toLowerCase().includes('write')) {
      return {
        action: 'write',
        selector: 'textarea[aria-label="Buscar"], input[name="q"]',
        value: prompt.split('"')[1] || 'OpenAI'
      };
    }
    if (prompt.toLowerCase().includes('submit')) {
      return {
        action: 'submit',
        selector: 'form[action="/search"], form[role="search"]'
      };
    }
    return {
      action: 'wait',
      timeout: 1000
    };
  }
}
