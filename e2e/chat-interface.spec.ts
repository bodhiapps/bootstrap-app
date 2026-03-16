import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

test.describe('Chat Interface', () => {
  test('should verify app loads with correct branding', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();

    // Verify React app mounted
    await expect(page.locator('#root')).toBeAttached();

    const layout = app.getLayout();
    await expect(layout).toBeVisible();

    // If in welcome state, check welcome branding
    const testState = await layout.getAttribute('data-test-state');
    if (testState === 'welcome') {
      await expect(app.welcome.getTitle()).toHaveText('Bodhi Bot');
      await expect(app.welcome.getSubtitle()).toHaveText('AI Research Assistant');
    }
  });
});
