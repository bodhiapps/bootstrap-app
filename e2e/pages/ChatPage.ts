import type { Page } from '@playwright/test';

export class ChatPage {
  constructor(private page: Page) {}

  readonly selectors = {
    chatArea: '[data-testid="div-chat-area"]',
    emptyState: '[data-testid="div-chat-empty-state"]',
    suggestedPrompt: '[data-testid="btn-suggested-prompt"]',
    input: '[data-testid="input-chat-message"]',
    sendButton: '[data-testid="btn-chat-send"]',
    newChatButton: '[data-testid="btn-chat-new"]',
    modelSelector: '[data-testid="select-model"]',
    userMessage: '[data-testid="div-message-user"]',
    assistantMessage: '[data-testid="div-message-assistant"]',
  };

  getChatArea() {
    return this.page.locator(this.selectors.chatArea);
  }
  getEmptyState() {
    return this.page.locator(this.selectors.emptyState);
  }
  getSuggestedPrompts() {
    return this.page.locator(this.selectors.suggestedPrompt);
  }
  getInput() {
    return this.page.locator(this.selectors.input);
  }
  getSendButton() {
    return this.page.locator(this.selectors.sendButton);
  }
  getNewChatButton() {
    return this.page.locator(this.selectors.newChatButton);
  }
  getModelSelector() {
    return this.page.locator(this.selectors.modelSelector);
  }

  async sendMessage(message: string) {
    await this.getInput().fill(message);
    await this.getSendButton().click();
  }

  async clickSuggestedPrompt(index = 0) {
    await this.getSuggestedPrompts().nth(index).click();
  }

  async clearChat() {
    await this.getNewChatButton().click();
  }
}
