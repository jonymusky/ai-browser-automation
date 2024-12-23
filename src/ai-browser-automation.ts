import { Builder, By, until, WebDriver, Key } from 'selenium-webdriver';
import {
  AutomationConfig,
  AutomationStep,
  AutomationResult,
  ExecutionConfig,
  AIAttemptContext
} from './types';
import { getLLMProvider } from './utils';
import { LLMProviderInterface } from './providers/llm-provider.interface';
import * as fs from 'fs';
import * as path from 'path';

export class AiBrowserAutomation {
  private driver!: WebDriver;
  private config: AutomationConfig;
  private llmProvider: LLMProviderInterface;

  constructor(config: AutomationConfig) {
    this.config = {
      screenshotPath: './screenshots',
      ...config
    };
    this.llmProvider = config.getLLMProvider
      ? config.getLLMProvider(config)
      : getLLMProvider(config);
  }

  async initialize(): Promise<void> {
    this.driver = await new Builder().forBrowser(this.config.browser).build();
  }

  async execute(
    steps: AutomationStep[],
    executionConfig?: ExecutionConfig
  ): Promise<AutomationResult> {
    try {
      await this.initialize();

      for (const step of steps) {
        if (step.solve_with_ai) {
          await this.executeStepWithAI(step);
        }
        await this.executeStep(step);
      }

      if (this.config.screenshotOnComplete) {
        const screenshot = await this.takeScreenshot(executionConfig?.screenshotName);
        return { success: true, screenshot };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      if (this.driver) {
        await this.driver.quit();
      }
    }
  }

  private async executeStep(step: AutomationStep): Promise<void> {
    console.log('Executing step:', step);

    switch (step.action) {
      case 'navigate':
        if (!step.url) throw new Error('URL is required for navigate action');
        await this.driver.get(step.url);
        break;

      case 'click': {
        if (!step.selector) throw new Error('Selector is required for click action');
        const element = await this.driver.findElement(By.css(step.selector));
        await element.click();
        break;
      }

      case 'write':
        if (!step.selector) throw new Error('Selector is required for write action');
        if (!step.value) throw new Error('Value is required for write action');
        try {
          const input = await this.driver.findElement(By.css(step.selector));
          await input.clear(); // Clear field before writing
          await input.sendKeys(step.value);
        } catch (error) {
          console.error('Failed to write with selector:', step.selector);
          // Try with alternative selector
          const input = await this.driver.findElement(
            By.css('textarea[aria-label="Buscar"], input[name="q"]')
          );
          await input.clear();
          await input.sendKeys(step.value);
        }
        break;

      case 'submit':
        try {
          if (step.selector) {
            // Try finding and submitting the form
            const form = await this.driver.findElement(By.css(step.selector));
            await form.submit();
          } else {
            // If no selector, try pressing Enter on the last active element
            await this.driver.switchTo().activeElement().sendKeys(Key.RETURN);
          }
        } catch (error) {
          console.error('Failed to submit with primary method, trying alternatives...');
          try {
            // Try pressing Enter on the search input
            const searchInput = await this.driver.findElement(
              By.css('textarea[aria-label="Buscar"], input[name="q"]')
            );
            await searchInput.sendKeys(Key.RETURN);
          } catch (submitError) {
            console.error('All submit attempts failed');
            throw submitError;
          }
        }
        break;

      case 'wait':
        if (step.selector) {
          // Wait for an element to be present
          const timeout = step.timeout || 5000;
          await this.driver.wait(
            until.elementLocated(By.css(step.selector)),
            timeout,
            `Timeout waiting for element: ${step.selector}`
          );
        } else if (step.timeout) {
          // Wait for a specific amount of time
          await new Promise((resolve) => setTimeout(resolve, step.timeout));
        }
        break;

      // ... TODO ...
    }
  }

  private parseAttributes(htmlString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const regex = /(\w+)="([^"]*)"/g;
    let match;

    while ((match = regex.exec(htmlString)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }

  private async getVisibleElements() {
    const interactiveSelectors = [
      'a',
      'button',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="searchbox"]',
      '[role="textbox"]',
      '[tabindex]:not([tabindex="-1"])',
      'label',
      'form',
      '[onclick]',
      '[class*="btn"]',
      '[class*="button"]',
      '[class*="link"]',
      '[id*="cookie"]',
      '[class*="cookie"]',
      '[id*="consent"]',
      '[class*="consent"]',
      '[aria-label*="cookie"]',
      '[aria-label*="consent"]'
    ].join(',');

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const elements = await this.driver.findElements(By.css(interactiveSelectors));
        const visibleElements = await Promise.all(
          elements.map(async (element) => {
            try {
              // Wait for the element to be visible
              await this.driver.wait(until.elementIsVisible(element), 1000);

              const [outerHTML, isEnabled, tagName, text] = await Promise.all([
                element.getAttribute('outerHTML'),
                element.isEnabled(),
                element.getTagName(),
                element.getText()
              ]);

              const attributes = this.parseAttributes(outerHTML);
              const location = await element.getRect();

              return {
                tag: tagName,
                text: text.slice(0, 100),
                attributes,
                isEnabled,
                isClickable:
                  (isEnabled && ['a', 'button'].includes(tagName)) ||
                  attributes.role === 'button' ||
                  attributes.onclick !== undefined,
                location,
                role: attributes.role || tagName
              };
            } catch (elementError) {
              // Return null for elements that fail
              return null;
            }
          })
        );

        // Filter out null elements and sort by vertical position
        return visibleElements
          .filter((el) => el !== null)
          .sort((a, b) => (a.location?.y || 0) - (b.location?.y || 0));
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          console.error('Failed to get visible elements after max retries');
          return [];
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    return [];
  }

  private async takeScreenshot(customName?: string): Promise<string> {
    const screenshot = await this.driver.takeScreenshot();
    const filename = customName ? `${customName}.png` : `screenshot-${Date.now()}.png`;
    const screenshotPath = this.config.screenshotPath || './screenshots';
    const filepath = path.join(screenshotPath, filename);

    if (!fs.existsSync(screenshotPath)) {
      fs.mkdirSync(screenshotPath, { recursive: true });
    }

    fs.writeFileSync(filepath, screenshot, 'base64');
    return filepath;
  }

  private async executeStepWithAI(step: AutomationStep): Promise<void> {
    const maxAttempts = this.config.maxAiAttempts || 5;
    const retryDelay = this.config.aiRetryDelay || 500;
    const attemptTimeout = 15000;

    const context: AIAttemptContext = {
      previousAttempts: [],
      visibleElements: [],
      searchStrategies: [
        { type: 'text', value: 'Menor precio' },
        { type: 'aria-label', value: 'Ordenar por menor precio' },
        { type: 'title', value: 'Ordenar por precio más bajo' },
        { type: 'class', contains: 'sort-price' },
        { type: 'data-testid', contains: 'sort-price' }
      ]
    };

    // Enhanced description for cookie consent
    const getEnhancedDescription = () => `
      ${step.description}
      Search strategies for cookie consent:
      - Look for buttons with text like "Accept", "Allow", "I Accept"
      - Look for elements with cookie-related IDs or classes
      - Look for elements with cookie-related aria labels
      - Look for elements within cookie consent modals or banners
      Previous failed attempts: ${JSON.stringify(context.previousAttempts)}
    `;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`AI Attempt ${attempt}/${maxAttempts} for: ${step.description}`);

      try {
        // Wait for page to stabilize
        const pageContent = await this.driver.getPageSource();

        context.visibleElements = await this.getVisibleElements();

        console.log('Previous attempts:', context.previousAttempts);

        const aiAction = await Promise.race([
          this.llmProvider.generateAction(
            getEnhancedDescription(),
            pageContent,
            context.visibleElements,
            context
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timeout')), attemptTimeout)
          )
        ]);

        console.log('AI suggested action:', aiAction);

        await Promise.race([
          (async () => {
            Object.assign(step, aiAction);
            await this.executeStep(step);
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Action execution timeout')), attemptTimeout)
          )
        ]);

        console.log('Step executed successfully');
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Attempt ${attempt} failed:`, errorMessage);
        console.error('Error details:', error);

        context.previousAttempts.push({
          selector: step.selector || '',
          error: errorMessage
        });

        if (attempt === maxAttempts) {
          console.error('All attempts exhausted');
          throw new Error(`Failed after ${maxAttempts} attempts: ${errorMessage}`);
        }

        console.log(`Waiting ${retryDelay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
}
