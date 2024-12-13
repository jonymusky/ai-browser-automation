import { AiBrowserAutomation } from '../src/ai-browser-automation';
import { AutomationConfig, AutomationStep } from '../src/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runExample() {
  const config: AutomationConfig = {
    llmProvider: 'Ollama' as const,
    screenshotOnComplete: true,
    browser: process.env.BROWSER as 'chrome' | 'firefox' | 'safari' || 'chrome',
    headless: process.env.HEADLESS === 'true',
    screenshotPath: process.env.SCREENSHOT_PATH,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama2'
  };

  const automation = new AiBrowserAutomation(config);

  const steps: AutomationStep[] = [
    {
      action: 'navigate' as const,
      description: 'Navigate to Google',
      url: 'https://www.google.com'
    },
    {
      action: 'write' as const,
      description: 'Search for "OpenAI"',
      solve_with_ai: true,
      // Fallback selector si el AI falla
      selector: 'textarea[aria-label="Buscar"], input[name="q"]',
      value: 'OpenAI'
    },
    {
      action: 'submit' as const,
      description: 'Submit the search',
      solve_with_ai: true,
      selector: 'form[action="/search"], form[role="search"]'
    },
    {
      action: 'wait' as const,
      description: 'Wait for search results to load',
      selector: '#search',  
      timeout: 10000  
    }
  ];

  try {
    const result = await automation.execute(steps, {
      screenshotName: 'google-search-openai'
    });
    console.log('Automation completed:', result);
  } catch (error) {
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

runExample(); 