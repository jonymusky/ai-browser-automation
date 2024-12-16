import { AiBrowserAutomation } from '../src/ai-browser-automation';
import { AutomationConfig, AutomationStep } from '../src/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMercadoLibreExample() {
  const config: AutomationConfig = {
    llmProvider: 'Grok' as const,
    screenshotOnComplete: true,
    browser: (process.env.BROWSER as 'chrome' | 'firefox' | 'safari') || 'chrome',
    headless: process.env.HEADLESS === 'true',
    screenshotPath: process.env.SCREENSHOT_PATH,
    grokModel: process.env.GROK_MODEL,
    apiKey: process.env.GROK_API_KEY
  };

  const automation = new AiBrowserAutomation(config);

  const steps: AutomationStep[] = [
    {
      action: 'navigate',
      description: 'Navigate to Gucci US',
      url: 'https://www.gucci.com/us/en/'
    },
    {
      action: 'click',
      description: 'OK on the cookie consent',
      solve_with_ai: true
    },
    {
      action: 'click',
      description: 'Continue on US site',
      solve_with_ai: true
    },
    {
      action: 'click',
      description: 'For Her',
      solve_with_ai: true
    },
    {
      action: 'click',
      description: 'the first product',
      solve_with_ai: true
    },
    {
      action: 'wait',
      description: 'If the product is available',
      timeout: 5000
    }
  ];

  try {
    const result = await automation.execute(steps, {
      screenshotName: 'gucci-us-example-grok'
    });
    console.log('Automation completed:', result);
  } catch (error) {
    console.error('Error during automation:', error);
  }
}

runMercadoLibreExample();
