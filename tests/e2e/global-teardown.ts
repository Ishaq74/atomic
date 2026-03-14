/**
 * Playwright global teardown — removes the seed user created in global-setup.
 */
import { SEED_EMAIL } from './global-setup';

export default async function globalTeardown() {
  const { getDrizzle, schema } = await import('../../src/database/drizzle');
  const { eq } = await import('drizzle-orm');
  const db = getDrizzle();

  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, SEED_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    const userId = existing[0].id;
    await db.delete(schema.account).where(eq(schema.account.userId, userId)).catch(() => {});
    await db.delete(schema.session).where(eq(schema.session.userId, userId)).catch(() => {});
    await db.delete(schema.user).where(eq(schema.user.id, userId)).catch(() => {});
  }
}
