import { test, expect } from '@playwright/test';

test('web mode searches external books without catalog controls', async ({ page }) => {
  let searches = 0;
  await page.route('**/api/web-search?*', async route => {
    searches++;
    expect(new URL(route.request().url()).searchParams.get('q')).toBe('robotics');
    await route.fulfill({ json: { query: 'robotics', cached: false, books: [{ id: 'sample', title: 'Robotics for Beginners', author: 'Example Author', category: 'Technology', description: 'A sample external listing.', url: 'https://play.google.com/store/books/details?id=sample', thumbnail: '', source: 'Google Play Books' }] } });
  });
  await page.goto('http://127.0.0.1:3000/search?source=web');
  expect(searches).toBe(0);
  await page.getByLabel('Search the web for books').fill('robotics');
  await page.getByRole('button', { name: 'Search the web', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 web results for “robotics”' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Robotics for Beginners' })).toHaveAttribute('href', 'https://play.google.com/store/books/details?id=sample');
  await expect(page.getByText('Example Author', { exact: true })).toBeVisible();
  await expect(page.getByText('Make it your own', { exact: true })).toHaveCount(0);
  expect(searches).toBe(1);
});

test('provider failure keeps catalog search reachable', async ({ page }) => {
  await page.route('**/api/web-search?*', route => route.fulfill({ status: 503, json: { detail: 'Web search quota is temporarily unavailable.' } }));
  await page.goto('http://127.0.0.1:3000/search?source=web&q=robotics');
  await expect(page.getByRole('heading', { name: 'Web search couldn’t finish' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Search the catalog instead' })).toHaveAttribute('href', '/search?q=robotics');
});
