import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

test.describe('App State Transitions', () => {
  test('should show initial state on load', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // App should render with a valid layout state
    const layout = app.getLayout();
    await expect(layout).toBeVisible();

    const testState = await layout.getAttribute('data-test-state');
    expect(['setup-required', 'welcome', 'chat']).toContain(testState);
  });

  test('should have correct elements for current state', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    const layout = app.getLayout();
    const testState = await layout.getAttribute('data-test-state');

    if (testState === 'welcome') {
      await expect(app.welcome.getScreen()).toBeVisible();
      await expect(app.welcome.getConnectButton()).toBeVisible();
    } else if (testState === 'setup-required') {
      // Setup state shows a setup button
      await expect(page.locator('text=Bodhi App connection required')).toBeVisible();
    }
    // Note: 'chat' state requires authentication, tested in full-demo-flow
  });
});
