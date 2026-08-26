import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { SEED_EMAIL, SEED_PASSWORD } from "./global-setup";

type StorageState = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;
const BASE_URL = "http://localhost:4322";
const LOCALES = ["fr", "en", "es", "ar"] as const;

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
  globalTagId: string;
  globalTagSlug: string;
  orgTagId: string;
  orgTagSlug: string;
}

let db: Awaited<ReturnType<typeof import("../../src/database/drizzle").getDrizzle>> | null = null;
let schema: typeof import("../../src/database/drizzle").schema | null = null;
let eqOp: typeof import("drizzle-orm").eq;
let seedUserId = "";
let adminStorageState: StorageState | null = null;
let seeded: SeedState;

function parseSetCookie(header: string) {
  const [pair] = header.split(";");
  const separator = pair.indexOf("=");
  return { name: pair.slice(0, separator), value: pair.slice(separator + 1), url: BASE_URL };
}

async function createAdminStorageState(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext();
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD }),
    redirect: "manual",
  });
  const setCookie = response.headers.getSetCookie();
  if (!setCookie.length) throw new Error(`No session cookie returned for seeded admin user (${response.status})`);
  await context.addCookies(setCookie.map(parseSetCookie));
  const state = await context.storageState();
  await context.close();
  return state;
}

test.describe.serial("Services surfaces", () => {
  test.beforeAll(async () => {
    const unique = randomUUID().slice(0, 8);
    const orgSlug = `e2e-services-org-${unique}`;
    const orgName = `E2E Services Org ${unique}`;
    const globalServiceId = randomUUID();
    const orgServiceId = randomUUID();
    const globalCategoryId = randomUUID();
    const orgCategoryId = randomUUID();
    const globalTagId = randomUUID();
    const orgTagId = randomUUID();
    const globalServiceSlug = `e2e-global-service-${unique}`;
    const orgServiceSlug = `e2e-org-service-${unique}`;
    const globalCategorySlug = `e2e-global-service-category-${unique}`;
    const orgCategorySlug = `e2e-org-service-category-${unique}`;
    const globalTagSlug = `e2e-global-service-tag-${unique}`;
    const orgTagSlug = `e2e-org-service-tag-${unique}`;
    const globalServiceTitle = `E2E Global Service ${unique}`;
    const orgServiceTitle = `E2E Org Service ${unique}`;

    const { getTestHelpers, auth } = await import("../helpers/auth");
    const drizzleMod = await import("../../src/database/drizzle");
    const orm = await import("drizzle-orm");
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
      { id: globalServiceId, organizationId: null, providerId: seedUser.id, slug: globalServiceSlug, status: "PUBLISHED", publishedAt, updatedBy: seedUser.id, priceMinor: 2500, currency: "EUR", durationMinutes: 60, maxParticipants: 4 },
      { id: orgServiceId, organizationId: org.id, providerId: seedUser.id, slug: orgServiceSlug, status: "PUBLISHED", publishedAt, updatedBy: seedUser.id, priceMinor: 5000, currency: "EUR", durationMinutes: 90, maxParticipants: 2 },
    ]);

    for (const locale of LOCALES) {
      await db.insert(schema.serviceTranslations).values([
        { serviceId: globalServiceId, organizationId: null, locale, title: `${globalServiceTitle} ${locale.toUpperCase()}`, slug: `${globalServiceSlug}-${locale}`, content: `<p>${globalServiceTitle} ${locale} content.</p>`, excerpt: `${globalServiceTitle} ${locale} excerpt.`, metaTitle: `${globalServiceTitle} ${locale}`, metaDescription: `${globalServiceTitle} ${locale} description.` },
        { serviceId: orgServiceId, organizationId: org.id, locale, title: `${orgServiceTitle} ${locale.toUpperCase()}`, slug: `${orgServiceSlug}-${locale}`, content: `<p>${orgServiceTitle} ${locale} content.</p>`, excerpt: `${orgServiceTitle} ${locale} excerpt.`, metaTitle: `${orgServiceTitle} ${locale}`, metaDescription: `${orgServiceTitle} ${locale} description.` },
      ]);
    }

    await db.insert(schema.serviceCategories).values([
      { id: globalCategoryId, organizationId: null, slug: globalCategorySlug },
      { id: orgCategoryId, organizationId: org.id, slug: orgCategorySlug },
    ]);
    await db.insert(schema.serviceCategoryTranslations).values(LOCALES.flatMap((locale) => [
      { categoryId: globalCategoryId, organizationId: null, locale, name: `Global Services ${locale.toUpperCase()}`, slug: `${globalCategorySlug}-${locale}` },
      { categoryId: orgCategoryId, organizationId: org.id, locale, name: `Org Services ${locale.toUpperCase()}`, slug: `${orgCategorySlug}-${locale}` },
    ]));
    await db.insert(schema.serviceCategoryLinks).values([
      { serviceId: globalServiceId, categoryId: globalCategoryId },
      { serviceId: orgServiceId, categoryId: orgCategoryId },
    ]);

    await db.insert(schema.serviceTags).values([
      { id: globalTagId, organizationId: null, slug: globalTagSlug },
      { id: orgTagId, organizationId: org.id, slug: orgTagSlug },
    ]);
    await db.insert(schema.serviceTagTranslations).values(LOCALES.flatMap((locale) => [
      { tagId: globalTagId, organizationId: null, locale, name: `Global tag ${locale.toUpperCase()}`, slug: `${globalTagSlug}-${locale}` },
      { tagId: orgTagId, organizationId: org.id, locale, name: `Org tag ${locale.toUpperCase()}`, slug: `${orgTagSlug}-${locale}` },
    ]));
    await db.insert(schema.serviceTagLinks).values([
      { serviceId: globalServiceId, tagId: globalTagId },
      { serviceId: orgServiceId, tagId: orgTagId },
    ]);

    seeded = { orgId: org.id, orgSlug, globalServiceId, orgServiceId, globalServiceSlug, orgServiceSlug, globalServiceTitle, orgServiceTitle, globalCategoryId, globalCategorySlug, orgCategoryId, orgCategorySlug, globalTagId, globalTagSlug, orgTagId, orgTagSlug };
  });

  test.beforeAll(async ({ browser }) => {
    adminStorageState = await createAdminStorageState(browser);
  });

  test.afterAll(async () => {
    if (!seeded || !db || !schema) return;
    const { getTestHelpers, auth } = await import("../helpers/auth");
    const helpers = await getTestHelpers();
    if (seedUserId) {
      const headers = await helpers.getAuthHeaders({ userId: seedUserId });
      await auth.api.deleteOrganization({ body: { organizationId: seeded.orgId }, headers }).catch(() => {});
    }
    for (const id of [seeded.globalServiceId, seeded.orgServiceId]) await db.delete(schema.services).where(eqOp(schema.services.id, id)).catch(() => {});
    for (const id of [seeded.globalCategoryId, seeded.orgCategoryId]) await db.delete(schema.serviceCategories).where(eqOp(schema.serviceCategories.id, id)).catch(() => {});
    for (const id of [seeded.globalTagId, seeded.orgTagId]) await db.delete(schema.serviceTags).where(eqOp(schema.serviceTags.id, id)).catch(() => {});
  });

  test("public global and organization services remain tenant isolated", async ({ page }) => {
    const globalResponse = await page.goto(`/fr/services?search=${encodeURIComponent(`${seeded.globalServiceTitle} FR`)}`, { waitUntil: "networkidle" });
    expect(globalResponse?.status()).toBe(200);
    await expect(page.getByRole("link", { name: `${seeded.globalServiceTitle} FR` }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `${seeded.orgServiceTitle} FR` })).toHaveCount(0);

    const orgResponse = await page.goto(`/fr/organizations/${seeded.orgSlug}/services?search=${encodeURIComponent(`${seeded.orgServiceTitle} FR`)}`, { waitUntil: "networkidle" });
    expect(orgResponse?.status()).toBe(200);
    await expect(page.getByRole("link", { name: `${seeded.orgServiceTitle} FR` }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `${seeded.globalServiceTitle} FR` })).toHaveCount(0);
  });

  test("all supported locales expose a localized service detail", async ({ page }) => {
    for (const locale of LOCALES) {
      const response = await page.goto(`/${locale}/services/${seeded.globalServiceSlug}-${locale}`, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: `${seeded.globalServiceTitle} ${locale.toUpperCase()}` })).toBeVisible();
    }
  });

  test("category and tag public routes are canonical and tenant-scoped", async ({ page }) => {
    const categoryResponse = await page.goto(`/fr/services/${seeded.globalCategorySlug}-fr`, { waitUntil: "networkidle" });
    expect(categoryResponse?.status()).toBe(200);
    await expect(page.getByRole("link", { name: `${seeded.globalServiceTitle} FR` }).first()).toBeVisible();

    const tagResponse = await page.goto(`/fr/services/tags/${seeded.globalTagSlug}-fr`, { waitUntil: "networkidle" });
    expect(tagResponse?.status()).toBe(200);
    await expect(page.getByRole("link", { name: `${seeded.globalServiceTitle} FR` }).first()).toBeVisible();

    const orgCategoryResponse = await page.goto(`/fr/organizations/${seeded.orgSlug}/services/${seeded.orgCategorySlug}-fr`, { waitUntil: "networkidle" });
    expect(orgCategoryResponse?.status()).toBe(200);
    await expect(page.getByRole("link", { name: `${seeded.orgServiceTitle} FR` }).first()).toBeVisible();
  });

  test("global admin exposes the complete Services resource workspace", async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminStorageState ?? undefined });
    const page = await context.newPage();
    const response = await page.goto("/fr/admin/services", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Administration des services/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Services/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Catégories/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Tags/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Modération/i })).toBeVisible();
    await expect(page.getByRole("link", { name: `${seeded.globalServiceTitle} FR` }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `${seeded.orgServiceTitle} FR` })).toHaveCount(0);

    await page.goto(`/fr/admin/services/${seeded.globalServiceId}/edit`, { waitUntil: "networkidle" });
    await expect(page.getByText(/Contenu/i).first()).toBeVisible();
    await expect(page.getByText(/Tarification/i).first()).toBeVisible();
    await expect(page.getByText(/Disponibilités/i).first()).toBeVisible();
    await expect(page.getByText(/SEO/i).first()).toBeVisible();
    await expect(page.getByText(/Révisions/i).first()).toBeVisible();
    await expect(page.getByText(/Verrouillage/i).first()).toBeVisible();
    await context.close();
  });

  test("organization admin exposes tenant-scoped Services workspace and editor", async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminStorageState ?? undefined });
    const page = await context.newPage();
    const response = await page.goto(`/fr/organizations/${seeded.orgSlug}/admin/services`, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("link", { name: `${seeded.orgServiceTitle} FR` }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `${seeded.globalServiceTitle} FR` })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Catégories/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Tags/i })).toBeVisible();

    await page.goto(`/fr/organizations/${seeded.orgSlug}/admin/services/${seeded.orgServiceId}/edit`, { waitUntil: "networkidle" });
    await expect(page.getByText(/Contenu/i).first()).toBeVisible();
    await expect(page.getByText(/Médias/i).first()).toBeVisible();
    await context.close();
  });
});
