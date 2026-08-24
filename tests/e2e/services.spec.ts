import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { SEED_EMAIL, SEED_PASSWORD } from './global-setup';

type StorageState = Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>;
const BASE_URL = 'http://localhost:4322';

interface SeedState {
  orgId: string;
  orgSlug: string;
  globalServiceId: string;
  orgServiceId: string;
  globalServiceSlug: string;
  orgServiceSlug: string;
  globalServiceTitle: string;
  orgServiceTitle: string;
  globalCategoryId: string;
  globalCategorySlug: string;
  orgCategoryId: string;
  orgCategorySlug: string;
}

let db: Awaited<ReturnType<typeof import('../../src/database/drizzle').getDrizzle>> | null = null;
let schema: typeof import('../../src/database/drizzle').schema | null = null;
let eqOp: typeof import('drizzle-orm').eq;
let seedUserId = '';
let adminStorageState: StorageState | null = null;
let seeded: SeedState;

function parseSetCookie(header: string) {
  const [pair] = header.split(';');
  const separator = pair.indexOf('=');
  return { name: pair.slice(0, separator), value: pair.slice(separator + 1), url: BASE_URL };
}

async function createAdminStorageState(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext();
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    redirect: 'manual',
  });
  const setCookie = response.headers.getSetCookie();
  if (!setCookie.length) throw new Error('No session cookie returned for seeded admin user');
  await context.addCookies(setCookie.map(parseSetCookie));
  const state = await context.storageState();
  await context.close();
  return state;
}

test.describe.serial('Services surfaces', () => {
  test.beforeAll(async () => {
    const unique = randomUUID().slice(0, 8);
    const orgSlug = `e2e-services-org-${unique}`;
    const orgName = `E2E Services Org ${unique}`;
    const globalServiceId = randomUUID();
    const orgServiceId = randomUUID();
    const globalCategoryId = randomUUID();
    const orgCategoryId = randomUUID();
    const globalServiceSlug = `e2e-global-service-${unique}`;
    const orgServiceSlug = `e2e-org-service-${unique}`;
    const globalCategorySlug = `e2e-global-service-category-${unique}`;
    const orgCategorySlug = `e2e-org-service-category-${unique}`;
    const globalServiceTitle = `E2E Global Service ${unique}`;
    const orgServiceTitle = `E2E Org Service ${unique}`;

    const { getTestHelpers, auth } = await import('../helpers/auth');
    const drizzleMod = await import('../../src/database/drizzle');
    const orm = await import('drizzle-orm');

    db = drizzleMod.getDrizzle();
    schema = drizzleMod.schema;
    eqOp = orm.eq;

    const helpers = await getTestHelpers();
    const [seedUser] = await db.select({ id: schema.user.id }).from(schema.user).where(eqOp(schema.user.email, SEED_EMAIL)).limit(1);
    if (!seedUser) throw new Error(`Seed user not found for ${SEED_EMAIL}`);
    seedUserId = seedUser.id;

    const headers = await helpers.getAuthHeaders({ userId: seedUser.id });
    const org = await auth.api.createOrganization({ body: { name: orgName, slug: orgSlug }, headers });
    const publishedAt = new Date();

    await db.insert(schema.services).values([
      { id: globalServiceId, organizationId: null, providerId: seedUser.id, slug: globalServiceSlug, status: 'PUBLISHED', publishedAt, updatedBy: seedUser.id, priceMinor: 2500, currency: 'EUR', durationMinutes: 60, maxParticipants: 4 },
      { id: orgServiceId, organizationId: org.id, providerId: seedUser.id, slug: orgServiceSlug, status: 'PUBLISHED', publishedAt, updatedBy: seedUser.id, priceMinor: 5000, currency: 'EUR', durationMinutes: 90, maxParticipants: 2 },
    ]);

    await db.insert(schema.serviceTranslations).values([
      { serviceId: globalServiceId, locale: 'fr', title: globalServiceTitle, slug: globalServiceSlug, content: `<p>${globalServiceTitle} content.</p>`, excerpt: `${globalServiceTitle} excerpt.`, metaTitle: globalServiceTitle, metaDescription: `${globalServiceTitle} description.` },
      { serviceId: orgServiceId, organizationId: org.id, locale: 'fr', title: orgServiceTitle, slug: orgServiceSlug, content: `<p>${orgServiceTitle} content.</p>`, excerpt: `${orgServiceTitle} excerpt.`, metaTitle: orgServiceTitle, metaDescription: `${orgServiceTitle} description.` },
    ]);

    await db.insert(schema.serviceCategories).values([
      { id: globalCategoryId, organizationId: null, slug: globalCategorySlug },
      { id: orgCategoryId, organizationId: org.id, slug: orgCategorySlug },
    ]);

    await db.insert(schema.serviceCategoryTranslations).values([
      { categoryId: globalCategoryId, locale: 'fr', name: `Global Services ${unique}`, slug: globalCategorySlug },
      { categoryId: orgCategoryId, organizationId: org.id, locale: 'fr', name: `Org Services ${unique}`, slug: orgCategorySlug },
    ]);

    await db.insert(schema.serviceCategoryLinks).values([
      { serviceId: globalServiceId, categoryId: globalCategoryId },
      { serviceId: orgServiceId, categoryId: orgCategoryId },
    ]);

    seeded = { orgId: org.id, orgSlug, globalServiceId, orgServiceId, globalServiceSlug, orgServiceSlug, globalServiceTitle, orgServiceTitle, globalCategoryId, globalCategorySlug, orgCategoryId, orgCategorySlug };
  });

  test.beforeAll(async ({ browser }) => {
    adminStorageState = await createAdminStorageState(browser);
  });

  test.afterAll(async () => {
    if (!seeded || !db || !schema) return;
    const { getTestHelpers, auth } = await import('../helpers/auth');
    const helpers = await getTestHelpers();
    if (seedUserId) {
      const headers = await helpers.getAuthHeaders({ userId: seedUserId });
      await auth.api.deleteOrganization({ body: { organizationId: seeded.orgId }, headers }).catch(() => {});
    }
    await db.delete(schema.services).where(eqOp(schema.services.id, seeded.globalServiceId)).catch(() => {});
    await db.delete(schema.services).where(eqOp(schema.services.id, seeded.orgServiceId)).catch(() => {});
    await db.delete(schema.serviceCategories).where(eqOp(schema.serviceCategories.id, seeded.globalCategoryId)).catch(() => {});
    await db.delete(schema.serviceCategories).where(eqOp(schema.serviceCategories.id, seeded.orgCategoryId)).catch(() => {});
  });

  test('global public services list and detail are tenant isolated and canonical', async ({ page }) => {
    const response = await page.goto(`/fr/services?search=${encodeURIComponent(seeded.globalServiceTitle)}`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('link', { name: seeded.globalServiceTitle }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: seeded.orgServiceTitle })).toHaveCount(0);

    const detail = await page.goto(`/fr/services/${seeded.globalServiceSlug}`, { waitUntil: 'networkidle' });
    expect(detail?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: seeded.globalServiceTitle })).toBeVisible();

    const canonical = await page.goto(`/fr/services/${seeded.globalCategorySlug}/${seeded.globalServiceSlug}`, { waitUntil: 'networkidle' });
    expect(canonical?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/fr/services/${seeded.globalCategorySlug}/${seeded.globalServiceSlug}$`));
  });

  test('organization public services isolate tenant and preserve organization URLs', async ({ page }) => {
    const response = await page.goto(`/fr/organizations/${seeded.orgSlug}/services`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('link', { name: seeded.orgServiceTitle }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: seeded.globalServiceTitle })).toHaveCount(0);

    const detail = await page.goto(`/fr/organizations/${seeded.orgSlug}/services/${seeded.orgCategorySlug}/${seeded.orgServiceSlug}`, { waitUntil: 'networkidle' });
    expect(detail?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: seeded.orgServiceTitle })).toBeVisible();
  });

  test('global admin exposes Services resource and organization admin exposes tenant resource', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminStorageState ?? undefined });
    const page = await context.newPage();
    const globalResponse = await page.goto('/fr/admin/services', { waitUntil: 'networkidle' });
    expect(globalResponse?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Services/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: seeded.globalServiceTitle }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: seeded.orgServiceTitle })).toHaveCount(0);

    const orgResponse = await page.goto(`/fr/organizations/${seeded.orgSlug}/admin/services`, { waitUntil: 'networkidle' });
    expect(orgResponse?.status()).toBe(200);
    await expect(page.getByRole('link', { name: seeded.orgServiceTitle }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: seeded.globalServiceTitle })).toHaveCount(0);
    await context.close();
  });
});
