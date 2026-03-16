import type { Page } from '@playwright/test';
import { WelcomePage } from './WelcomePage';
import { ChatPage } from './ChatPage';
import { HeaderPage } from './HeaderPage';

export class AppPage {
  readonly welcome: WelcomePage;
  readonly header: HeaderPage;
  readonly chat: ChatPage;

  constructor(private page: Page) {
    this.welcome = new WelcomePage(page);
    this.header = new HeaderPage(page);
    this.chat = new ChatPage(page);
  }

  readonly selectors = {
    layout: '[data-testid="div-app-layout"]',
    setupRequired: '[data-testid="div-app-layout"][data-test-state="setup-required"]',
    welcomeView: '[data-testid="div-app-layout"][data-test-state="welcome"]',
    chatView: '[data-testid="div-app-layout"][data-test-state="chat"]',
  };

  async goto() {
    await this.page.goto('/');
  }

  getLayout() {
    return this.page.locator(this.selectors.layout);
  }
}
