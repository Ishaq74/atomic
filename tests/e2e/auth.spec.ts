import { test, expect } from '@playwright/test';
import { SEED_EMAIL, SEED_PASSWORD, SEED_NAME } from './global-setup';

/**
 * E2E tests for auth flows.
 *
 * global-setup.ts seeds a verified user (SEED_EMAIL / SEED_PASSWORD).
 * This lets us test real sign-in → dashboard flows.
 *
 * A fresh unverified user is also created during sign-up tests to verify
 * that requireEmailVerification blocks unverified accounts.
 */

const FRESH_EMAIL = `e2e-${Date.now()}@test.com`;
const FRESH_PASSWORD = 'E2eTest1234!';
const FRESH_NAME = 'E2E Tester';

/** Sign in as seed user — reliable across browsers (Chromium, Firefox, WebKit). */
async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/fr/auth/connexion', { waitUntil: 'networkidle' });
  await page.locator('input[name="email"]').fill(SEED_EMAIL);
  await page.locator('input[name="password"]').fill(SEED_PASSWORD);
  const submitBtn = page.locator('button[type="submit"], form button').first();
  await Promise.all([
    page.waitForURL(/tableau-de-bord|dashboard/, { timeout: 30000 }),
    submitBtn.click(),
  ]);
  await page.waitForLoadState('networkidle');
}

// ─── Sign-up form flow ──────────────────────────────────────────────

test.describe('Sign-up flow', () => {
  test('sign-up form submits and redirects to sign-in page', async ({ page }) => {
    await page.goto('/fr/auth/inscription', { waitUntil: 'networkidle' });
    const response = await page.goto('/fr/auth/inscription', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);

    await page.locator('input[name="name"]').fill(FRESH_NAME);
    await page.locator('input[name="email"]').fill(FRESH_EMAIL);
    await page.locator('input[name="password"]').fill(FRESH_PASSWORD);

    // Some forms have a username field
    const usernameField = page.locator('input[name="username"]');
    if (await usernameField.isVisible({ timeout: 500 }).catch(() => false)) {
      await usernameField.fill(`e2etester${Date.now()}`);
    }

    const submitBtn = page.locator('button[type="submit"], form button').first();
    await Promise.all([
      page.waitForURL(/connexion|sign-in/, { timeout: 30000 }),
      submitBtn.click(),
    ]);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/connexion|sign-in/);
  });

  test('sign-in form rejects unverified email', async ({ page }) => {
    await page.goto('/fr/auth/connexion', { waitUntil: 'networkidle' });

    await page.locator('input[name="email"]').fill(FRESH_EMAIL);
    await page.locator('input[name="password"]').fill(FRESH_PASSWORD);
    await page.locator('button[type="submit"], form button').first().click();

    // Unverified email — should stay on sign-in with an error
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/connexion|sign-in/);
  });
});

// ─── Authenticated flow (uses verified seed user) ──────────────────

test.describe('Authenticated flow', () => {
  test('verified user can sign in and reach dashboard', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/tableau-de-bord|dashboard/);
  });

  test('authenticated user can access profile page', async ({ page }) => {
    await signIn(page);

    // Navigate to profile
    const response = await page.goto('/fr/auth/profil', { waitUntil: 'networkidle' });
    expect(response?.ok()).toBeTruthy();

    // Verify user info is displayed
    const body = await page.textContent('body');
    expect(body).toContain(SEED_NAME);
    expect(body).toContain(SEED_EMAIL);
  });
});

// ─── Auth guards (unauthenticated) ─────────────────────────────────

test.describe('Auth guards', () => {
  test('organisations page redirects to sign-in', async ({ page }) => {
    const response = await page.goto('/fr/auth/organisations');
    // After redirect chain, final page should be 200
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/connexion|sign-in/);
  });

  test('verify-email page is accessible without auth', async ({ page }) => {
    const response = await page.goto('/fr/auth/verifier-email');
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveURL(/connexion|sign-in/);
  });

  test('reset-password page is accessible without auth', async ({ page }) => {
    const response = await page.goto('/fr/auth/reinitialiser-mot-de-passe');
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveURL(/connexion|sign-in/);
  });
});

// ─── Public pages smoke tests ───────────────────────────────────────

test.describe('Public pages', () => {
  test('about page loads', async ({ page }) => {
    const response = await page.goto('/fr/a-propos');
    expect(response?.status()).toBe(200);
    await expect(page.locator('main, [role="main"], article').first()).toBeVisible();
  });

  test('contact page loads', async ({ page }) => {
    const response = await page.goto('/fr/contact');
    expect(response?.status()).toBe(200);
    await expect(page.locator('main, [role="main"], article').first()).toBeVisible();
  });

  test('legal page loads', async ({ page }) => {
    const response = await page.goto('/fr/mentions-legales');
    expect(response?.status()).toBe(200);
    await expect(page.locator('main, [role="main"], article').first()).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    const response = await page.goto('/fr/auth/mot-de-passe-oublie');
    expect(response?.status()).toBe(200);
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  });

  test('Spanish locale loads correctly', async ({ page }) => {
    const response = await page.goto('/es/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});
