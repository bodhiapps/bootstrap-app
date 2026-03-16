import type { Page } from '@playwright/test';

export class WelcomePage {
  constructor(private page: Page) {}

  // Selectors
  readonly selectors = {
    screen: '[data-testid="div-welcome-screen"]',
    title: '[data-testid="span-welcome-title"]',
    subtitle: '[data-testid="span-welcome-subtitle"]',
    connectButton: '[data-testid="btn-welcome-connect"]',
    progress: '[data-testid="span-welcome-progress"]',
    mcpIndicatorExa: '[data-testid="span-mcp-indicator-exa"]',
    mcpIndicatorNotion: '[data-testid="span-mcp-indicator-notion"]',
  };

  async goto() {
    await this.page.goto('/');
  }

  getScreen() {
    return this.page.locator(this.selectors.screen);
  }
  getTitle() {
    return this.page.locator(this.selectors.title);
  }
  getSubtitle() {
    return this.page.locator(this.selectors.subtitle);
  }
  getConnectButton() {
    return this.page.locator(this.selectors.connectButton);
  }
  getProgress() {
    return this.page.locator(this.selectors.progress);
  }
  getMcpIndicators() {
    return {
      exa: this.page.locator(this.selectors.mcpIndicatorExa),
      notion: this.page.locator(this.selectors.mcpIndicatorNotion),
    };
  }
}
