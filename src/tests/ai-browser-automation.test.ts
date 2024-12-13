import { AiBrowserAutomation } from '../ai-browser-automation';
import { AutomationConfig, AutomationStep } from '../types';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { OpenAIProvider } from '../providers/openai-provider';
import { Builder, WebDriver, WebElement } from 'selenium-webdriver';

// Add type for builder returns
type BuilderReturn = {
  build: () => Promise<WebDriver>;
};

describe('AiBrowserAutomation', function () {
  this.timeout(10000);

  let automation: AiBrowserAutomation;
  let providerStub: sinon.SinonStubbedInstance<OpenAIProvider>;
  let driverStub: WebDriver;
  let builderStub: sinon.SinonStub;

  const config: AutomationConfig = {
    llmProvider: 'OpenAI' as const,
    apiKey: 'test-key',
    screenshotOnComplete: true,
    browser: 'chrome',
    headless: true,
    screenshotPath: './test-screenshots'
  };

  beforeEach(() => {
    // Create a basic element stub with all required methods
    const elementStub = {
      click: () => Promise.resolve(),
      sendKeys: () => Promise.resolve(),
      clear: () => Promise.resolve(),
      submit: () => Promise.resolve(),
      getText: () => Promise.resolve('text'),
      getAttribute: () => Promise.resolve('attribute'),
      isDisplayed: () => Promise.resolve(true),
      getTagName: () => Promise.resolve('div'),
      findElement: () => Promise.resolve(elementStub),
      findElements: () => Promise.resolve([elementStub])
    } as unknown as WebElement;

    // Create a basic driver stub
    driverStub = {
      get: () => Promise.resolve(),
      findElement: () => Promise.resolve(elementStub),
      quit: () => Promise.resolve(),
      takeScreenshot: () => Promise.resolve('base64screenshot'),
      getPageSource: () => Promise.resolve('<html></html>'),
      findElements: () => Promise.resolve([elementStub]),
      switchTo: () => ({
        activeElement: () => elementStub
      }),
      wait: () => Promise.resolve()
    } as unknown as WebDriver;

    // Stub the Builder
    builderStub = sinon.stub(Builder.prototype, 'forBrowser').returns({
      build: () => Promise.resolve(driverStub)
    } as BuilderReturn);

    // Create provider stub
    providerStub = sinon.createStubInstance(OpenAIProvider);
    providerStub.generateAction.resolves({
      action: 'write',
      selector: 'input[name="q"]',
      value: 'test search'
    });

    automation = new AiBrowserAutomation({
      ...config,
      getLLMProvider: () => providerStub
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should execute steps successfully', async () => {
      const steps: AutomationStep[] = [
        {
          action: 'navigate',
          description: 'Navigate to test page',
          url: 'https://example.com'
        }
      ];

      const result = await automation.execute(steps);
      expect(result.success).to.be.true;
    });

    it('should handle errors gracefully', async () => {
      // Restore previous stub and create new one
      builderStub.restore();

      const errorDriver = {
        findElement: () => Promise.reject(new Error('Element not found')),
        quit: () => Promise.resolve(),
        get: () => Promise.resolve(),
        takeScreenshot: () => Promise.resolve('base64screenshot'),
        getPageSource: () => Promise.resolve('<html></html>')
      } as unknown as WebDriver;

      sinon.stub(Builder.prototype, 'forBrowser').returns({
        build: () => Promise.resolve(errorDriver)
      } as BuilderReturn);

      const errorAutomation = new AiBrowserAutomation({
        ...config,
        getLLMProvider: () => providerStub
      });

      const steps: AutomationStep[] = [
        {
          action: 'click',
          description: 'Click non-existent element',
          selector: '#non-existent'
        }
      ];

      const result = await errorAutomation.execute(steps);
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Element not found');
    });

    it('should take screenshot when configured', async () => {
      const steps: AutomationStep[] = [
        {
          action: 'navigate',
          description: 'Navigate to test page',
          url: 'https://example.com'
        }
      ];

      const result = await automation.execute(steps, {
        screenshotName: 'test-screenshot'
      });
      expect(result.success).to.be.true;
      expect(result.screenshot).to.exist;
      expect(result.screenshot).to.include('test-screenshot.png');
    });

    it('should handle AI-assisted steps', async () => {
      const steps: AutomationStep[] = [
        {
          action: 'write',
          description: 'Write in search box',
          solve_with_ai: true,
          value: 'test search'
        }
      ];

      const result = await automation.execute(steps);
      expect(result.success).to.be.true;
      expect(providerStub.generateAction.calledOnce).to.be.true;
      expect(providerStub.generateAction.firstCall.args[0]).to.include('Write in search box');
    });
  });
});
