import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://www.decathlon.in/';

async function getSearchInput(page: Page) {
  const candidates = [
    page.getByRole('searchbox'),
    page.locator('input[type="search"]').first(),
    page.locator('input[placeholder*="Search" i]').first(),
  ];

  for (const locator of candidates) {
    if (await locator.count()) {
      const target = locator.first();
      if (await target.isVisible().catch(() => false)) {
        return target;
      }
    }
  }

  throw new Error('Could not locate a visible search input on Decathlon homepage.');
}

test.describe('Decathlon India E-Commerce Smoke & Functional Tests', () => {
  test('TC_DEC_001 - Homepage loads with title, header, and search input', async ({ page }) => {
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page).toHaveTitle(/decathlon/i);
    await expect(page.locator('header, nav').first()).toBeVisible();

    const searchInput = await getSearchInput(page);
    await expect(searchInput).toBeVisible();
  });

  test('TC_DEC_002 - Search for a valid product displays matching results', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const searchInput = await getSearchInput(page);
    await searchInput.click();
    await searchInput.fill('running shoes');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify URL or visible product listings reflect the search
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toContain('shoe');
  });

  test('TC_DEC_003 - Search with non-existent keyword handles gracefully', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const searchInput = await getSearchInput(page);
    await searchInput.click();
    await searchInput.fill('xyz nonexistent sport item 999');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();

    const text = (await page.locator('body').innerText()).toLowerCase();
    const hasEmptyIndicator =
      text.includes('no result') ||
      text.includes('0 result') ||
      text.includes('not found') ||
      text.includes('sorry') ||
      text.includes('try searching');

    expect(hasEmptyIndicator || page.url().includes('search')).toBeTruthy();
  });

  test('TC_DEC_004 - Open a product detail page from search results', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    const searchInput = await getSearchInput(page);
    await searchInput.click();
    await searchInput.fill('football');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle').catch(() => {});

    // Click the first product link pointing to a product page (/p/)
    const productLink = page.locator('a[href*="/p/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15000 });
    await Promise.all([
      page.waitForURL(/\/p\//, { timeout: 15000 }).catch(() => {}),
      productLink.click(),
    ]);

    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('TC_DEC_005 - Cart page loads without server errors', async ({ page }) => {
    const response = await page.goto('https://www.decathlon.in/checkout/cart', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC_DEC_006 - Login page loads with email/credential fields', async ({ page }) => {
    const response = await page.goto('https://www.decathlon.in/support/login', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(page.locator('input').first()).toBeVisible();
  });
});