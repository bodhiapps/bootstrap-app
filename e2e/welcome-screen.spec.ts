import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

test.describe('Welcome Screen', () => {
  test('should display welcome screen with branding and MCP indicators', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // The app should show either setup-required or welcome state
    const layout = app.getLayout();
    await expect(layout).toBeVisible();

    // Check if we're in welcome state (extension is available)
    // or setup-required state (extension not found)
    const testState = await layout.getAttribute('data-test-state');

    if (testState === 'welcome') {
      // Verify welcome screen branding
      await expect(app.welcome.getTitle()).toHaveText('Bodhi Bot');
      await expect(app.welcome.getSubtitle()).toHaveText('AI Research Assistant');

      // Verify MCP indicators present in disconnected state
      const mcpIndicators = app.welcome.getMcpIndicators();
      await expect(mcpIndicators.exa).toBeVisible();
      await expect(mcpIndicators.exa).toHaveAttribute('data-test-state', 'disconnected');
      await expect(mcpIndicators.notion).toBeVisible();
      await expect(mcpIndicators.notion).toHaveAttribute('data-test-state', 'disconnected');

      // Verify connect button is visible and idle
      const connectButton = app.welcome.getConnectButton();
      await expect(connectButton).toBeVisible();
      await expect(connectButton).toHaveAttribute('data-test-state', 'idle');
    } else {
      // Setup required state — verify the layout state
      expect(testState).toBe('setup-required');
    }
  });
});
