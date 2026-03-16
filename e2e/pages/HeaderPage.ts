import type { Page } from '@playwright/test';

export class HeaderPage {
  constructor(private page: Page) {}

  readonly selectors = {
    title: '[data-testid="span-app-title"]',
    subtitle: '[data-testid="span-app-subtitle"]',
    mcpIndicators: '[data-testid="div-mcp-indicators"]',
    settings: '[data-testid="btn-settings"]',
    authSection: '[data-testid="section-auth"]',
    logoutButton: '[data-testid="btn-auth-logout"]',
    authName: '[data-testid="span-auth-name"]',
  };

  getTitle() {
    return this.page.locator(this.selectors.title);
  }
  getSubtitle() {
    return this.page.locator(this.selectors.subtitle);
  }
  getMcpIndicators() {
    return this.page.locator(this.selectors.mcpIndicators);
  }
  getSettings() {
    return this.page.locator(this.selectors.settings);
  }
  getAuthSection() {
    return this.page.locator(this.selectors.authSection);
  }
  getLogoutButton() {
    return this.page.locator(this.selectors.logoutButton);
  }

  getMcpStatus(slug: string) {
    return this.page.locator(`[data-testid="span-mcp-status-${slug}"]`);
  }

  async logout() {
    await this.getLogoutButton().click();
  }
}
