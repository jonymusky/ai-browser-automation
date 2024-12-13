import { Builder, By, until, WebDriver, Key } from 'selenium-webdriver';
import { AutomationConfig, AutomationStep, AutomationResult, ExecutionConfig } from './types';
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
    this.llmProvider = config.getLLMProvider ? 
      config.getLLMProvider(config) : 
      getLLMProvider(config);
  }

  async initialize(): Promise<void> {
    this.driver = await new Builder()
      .forBrowser(this.config.browser)
      .build();
  }

  async execute(steps: AutomationStep[], executionConfig?: ExecutionConfig): Promise<AutomationResult> {
    try {
      await this.initialize();
      
      for (const step of steps) {
        try {
          if (step.solve_with_ai) {
            const pageContent = await this.driver.getPageSource();
            const visibleElements = await this.getVisibleElements();
            
            const aiAction = await this.llmProvider.generateAction(
              step.description,
              pageContent,
              visibleElements
            );
            
            Object.assign(step, aiAction);
          }
          
          await this.executeStep(step);
        } catch (stepError) {
          throw stepError;
        }
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
        
      case 'click':
        if (!step.selector) throw new Error('Selector is required for click action');
        const element = await this.driver.findElement(By.css(step.selector));
        await element.click();
        break;
        
      case 'write':
        if (!step.selector) throw new Error('Selector is required for write action');
        if (!step.value) throw new Error('Value is required for write action');
        try {
          const input = await this.driver.findElement(By.css(step.selector));
          await input.clear();  // Clear field before writing
          await input.sendKeys(step.value);
        } catch (error) {
          console.error('Failed to write with selector:', step.selector);
          // Try with alternative selector
          const input = await this.driver.findElement(By.css('textarea[aria-label="Buscar"], input[name="q"]'));
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
          await new Promise(resolve => setTimeout(resolve, step.timeout));
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
    const elements = await this.driver.findElements(By.css('*'));
    const visibleElements = [];
    
    for (const element of elements) {
      if (await element.isDisplayed()) {
        const outerHTML = await element.getAttribute("outerHTML");
        visibleElements.push({
          tag: await element.getTagName(),
          text: await element.getText(),
          attributes: this.parseAttributes(outerHTML)
        });
      }
    }
    
    return visibleElements;
  }

  private async takeScreenshot(customName?: string): Promise<string> {
    const screenshot = await this.driver.takeScreenshot();
    const filename = customName ? 
      `${customName}.png` : 
      `screenshot-${Date.now()}.png`;
    const screenshotPath = this.config.screenshotPath || './screenshots';
    const filepath = path.join(screenshotPath, filename);
    
    if (!fs.existsSync(screenshotPath)) {
      fs.mkdirSync(screenshotPath, { recursive: true });
    }
    
    fs.writeFileSync(filepath, screenshot, 'base64');
    return filepath;
  }
} 