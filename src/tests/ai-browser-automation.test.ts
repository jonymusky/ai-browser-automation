import { AiBrowserAutomation } from '../ai-browser-automation';
import { AutomationConfig, AutomationStep } from '../types';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { OpenAIProvider } from '../providers/openai-provider';
import { Builder, WebDriver, WebElement, By, WebElementPromise } from 'selenium-webdriver';

describe('AiBrowserAutomation', () => {
  let automation: AiBrowserAutomation;
  let providerStub: sinon.SinonStubbedInstance<OpenAIProvider>;
  let driverStub: WebDriver;
  
  const config: AutomationConfig = {
    llmProvider: 'OpenAI' as const,
    apiKey: 'test-key',
    screenshotOnComplete: true,
    browser: 'chrome',
    headless: true,
    screenshotPath: './test-screenshots'
  };

  beforeEach(() => {
    // Create WebElement stub with all required methods
    const elementStub = {
      // Required WebElement methods
      getId: () => Promise.resolve('id'),
      getDriver: () => driverStub,
      getSize: () => Promise.resolve({ width: 0, height: 0 }),
      getLocation: () => Promise.resolve({ x: 0, y: 0 }),
      getShadowRoot: () => Promise.resolve(null),
      serialize: () => Promise.resolve({ 'element-6066-11e4-a52e-4f735466cecf': 'id' }),

      // Common used methods
      click: () => Promise.resolve(),
      sendKeys: () => Promise.resolve(),
      clear: () => Promise.resolve(),
      submit: () => Promise.resolve(),
      getText: () => Promise.resolve('text'),
      getAttribute: () => Promise.resolve('attribute'),
      isDisplayed: () => Promise.resolve(true),
      getTagName: () => Promise.resolve('div'),
      getCssValue: () => Promise.resolve(''),
      getRect: () => Promise.resolve({ x: 0, y: 0, width: 0, height: 0 }),
      isEnabled: () => Promise.resolve(true),
      isSelected: () => Promise.resolve(false),
      takeScreenshot: () => Promise.resolve(''),
      findElement: () => elementPromise,
      findElements: () => Promise.resolve([])
    } as unknown as WebElement;

    // Create a WebElementPromise-like object
    const elementPromise = Promise.resolve(elementStub) as WebElementPromise;

    // Create driver stub
    driverStub = {
      get: () => Promise.resolve(),
      findElement: () => elementPromise,
      quit: () => Promise.resolve(),
      takeScreenshot: () => Promise.resolve('base64screenshot'),
      getPageSource: () => Promise.resolve('<html></html>'),
      findElements: () => Promise.resolve([elementStub]),
      switchTo: () => ({
        activeElement: () => elementStub
      }),
      wait: () => Promise.resolve()
    } as any;

    // Stub Builder
    sinon.stub(Builder.prototype, 'forBrowser').returns({
      build: () => Promise.resolve(driverStub)
    } as any);

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
          action: 'navigate' as const,
          description: 'Navigate to test page',
          url: 'https://example.com'
        }
      ];

      const result = await automation.execute(steps);
      expect(result.success).to.be.true;
    });

    it('should handle errors gracefully', async () => {
      // First clear previous stubs
      sinon.restore();

      // Create a complete error driver stub with required WebDriver methods
      const errorDriver = {
        get: () => Promise.resolve(),
        findElement: () => {
          // This will be called by executeStep for the click action
          throw new Error('Element not found');
        },
        quit: sinon.stub().resolves(),
        takeScreenshot: () => Promise.resolve('base64screenshot'),
        getPageSource: () => Promise.resolve('<html></html>'),
        findElements: () => Promise.resolve([]),
        switchTo: () => ({
          activeElement: () => ({
            sendKeys: () => Promise.resolve()
          })
        }),
        wait: () => Promise.resolve(),
        // Add required WebDriver methods
        execute: () => Promise.resolve(),
        setFileDetector: () => Promise.resolve(),
        getExecutor: () => ({}),
        getSession: () => Promise.resolve({ getId: () => 'session-id' }),
        getCapabilities: () => Promise.resolve({}),
        executeScript: () => Promise.resolve(),
        executeAsyncScript: () => Promise.resolve(),
        sleep: () => Promise.resolve(),
        getWindowHandle: () => Promise.resolve(''),
        getAllWindowHandles: () => Promise.resolve([]),
        close: () => Promise.resolve(),
        manage: () => ({
          setTimeouts: () => Promise.resolve(),
          window: () => ({
            maximize: () => Promise.resolve()
          })
        }),
        navigate: () => ({
          to: () => Promise.resolve(),
          back: () => Promise.resolve(),
          forward: () => Promise.resolve(),
          refresh: () => Promise.resolve()
        }),
        actions: () => ({
          clear: () => Promise.resolve(),
          perform: () => Promise.resolve()
        })
      } as unknown as WebDriver;

      // Store the quit stub separately to access its properties
      const quitStub = errorDriver.quit as sinon.SinonStub;

      // Create a new automation instance with the error driver
      const errorAutomation = new AiBrowserAutomation({
        ...config,
        getLLMProvider: () => providerStub
      });

      // Install the Builder stub
      sinon.stub(Builder.prototype, 'forBrowser').returns({
        build: () => Promise.resolve(errorDriver)
      } as any);

      const steps: AutomationStep[] = [
        {
          action: 'click' as const,  // Use click action which we know will fail
          description: 'Click non-existent element',
          selector: '#non-existent'
        }
      ];

      const result = await errorAutomation.execute(steps);
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Element not found');
      expect(quitStub.called).to.be.true;
    });

    it('should take screenshot when configured', async () => {
      const steps: AutomationStep[] = [
        {
          action: 'navigate' as const,
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
          action: 'write' as const,
          description: 'Write in search box',
          solve_with_ai: true,
          value: 'test search'
        }
      ];

      // Setup the stub with the correct number of arguments
      providerStub.generateAction.resolves({
        action: 'write',
        selector: 'input[name="q"]',
        value: 'test search'
      });

      const result = await automation.execute(steps);
      expect(result.success).to.be.true;
      expect(providerStub.generateAction.calledOnce).to.be.true;
      expect(providerStub.generateAction.firstCall.args[0]).to.include('Write in search box');
    });
  });
}); 