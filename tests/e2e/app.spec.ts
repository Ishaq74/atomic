import { test, expect } from '@playwright/test';

// ─── Public pages ───────────────────────────────────────────────────

test.describe('Homepage & i18n', () => {
  test('homepage redirects to default locale /fr/', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/fr\/?/);
  });

  test('French page has lang="fr" and dir="ltr"', async ({ page }) => {
    const response = await page.goto('/fr/');
    expect(response?.status()).toBe(200);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'fr');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });

  test('English page has lang="en"', async ({ page }) => {
    const response = await page.goto('/en/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('Arabic page has dir="rtl"', async ({ page }) => {
    const response = await page.goto('/ar/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('navigation and footer are rendered', async ({ page }) => {
    const response = await page.goto('/fr/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });
});

// ─── Auth — guest guards ────────────────────────────────────────────

test.describe('Auth - Guest guards', () => {
  test('sign-in page renders the login form', async ({ page }) => {
    const response = await page.goto('/fr/auth/connexion');
    expect(response?.status()).toBe(200);
    // Verify actual form elements exist (not just vague text)
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    // Submit button may use a different element — check for any clickable submit
    await expect(page.locator('form button, button[type="submit"], input[type="submit"]').first()).toBeVisible();
  });

  test('sign-up page renders the registration form', async ({ page }) => {
    const response = await page.goto('/fr/auth/inscription');
    expect(response?.status()).toBe(200);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('form button, button[type="submit"], input[type="submit"]').first()).toBeVisible();
  });

  test('dashboard redirects unauthenticated user to sign-in', async ({ page }) => {
    const response = await page.goto('/fr/auth/tableau-de-bord');
    expect(response?.ok()).toBeTruthy();
    await page.waitForURL(/connexion/);
    await expect(page).toHaveURL(/connexion/);
  });

  test('profile redirects unauthenticated user to sign-in', async ({ page }) => {
    const response = await page.goto('/fr/auth/profil');
    expect(response?.ok()).toBeTruthy();
    await page.waitForURL(/connexion/);
    await expect(page).toHaveURL(/connexion/);
  });

  test('admin redirects unauthenticated user to sign-in', async ({ page }) => {
    const response = await page.goto('/fr/admin/stats');
    expect(response?.ok()).toBeTruthy();
    await page.waitForURL(/connexion/);
    await expect(page).toHaveURL(/connexion/);
  });
});
