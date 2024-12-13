# AI Browser Automation

+ ![Tests](https://github.com/jonymusky/ai-browser-automation/workflows/Tests/badge.svg)
+ ![Lint](https://github.com/jonymusky/ai-browser-automation/workflows/Lint/badge.svg)
  

A TypeScript package that combines Selenium WebDriver with AI capabilities for intelligent browser automation.

## Overview

This package provides an easy way to automate browser interactions using AI capabilities. It supports multiple LLM providers (OpenAI, Ollama) and can automatically detect and interact with web elements.

## Features

- Selenium-based browser automation
- AI-powered element detection and interaction
- Support for multiple LLM providers (OpenAI, Ollama)
- Screenshot capture capability
- Flexible step-based automation configuration

## Installation

```bash
npm install ai-browser-automation
# or
pnpm add ai-browser-automation
```

## Usage

```typescript
import { AiBrowserAutomation } from 'ai-browser-automation';

const automation = new AiBrowserAutomation({
  llmProvider: 'OpenAI',
  apiKey: 'your-api-key',
  browser: 'chrome',
  headless: true
});

const steps = [
  {
    action: 'navigate',
    description: 'Go to Google',
    url: 'https://google.com'
  },
  {
    action: 'write',
    description: 'Search for something',
    solve_with_ai: true
  }
];

const result = await automation.execute(steps);
```