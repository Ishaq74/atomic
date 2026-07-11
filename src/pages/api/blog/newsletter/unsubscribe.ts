import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDrizzle } from '@database/drizzle';
import { blogSubscribers } from '@database/schemas';
import { logAuditEvent, extractIp } from '@/lib/audit';

export const prerender = false;

export const GET: APIRoute = async ({ url, request, clientAddress, locals }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(renderMessage(false, 'Lien de désinscription invalide.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const db = getDrizzle();
  const subscriber = await db
    .select()
    .from(blogSubscribers)
    .where(eq(blogSubscribers.token, token))
    .limit(1);

  if (subscriber.length === 0) {
    return new Response(renderMessage(false, 'Lien de désinscription invalide ou expiré.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (subscriber[0].status !== 'UNSUBSCRIBED') {
    await db
      .update(blogSubscribers)
      .set({ status: 'UNSUBSCRIBED', unsubscribedAt: new Date(), updatedAt: new Date() })
      .where(eq(blogSubscribers.token, token));

    await logAuditEvent({
      userId: 'system',
      action: 'BLOG_NEWSLETTER_UNSUBSCRIBE',
      resource: 'blogSubscriber',
      resourceId: subscriber[0].id,
      ipAddress: extractIp(request.headers, clientAddress),
      userAgent: request.headers.get('user-agent'),
    });
  }

  return new Response(renderMessage(true, 'Vous êtes désabonné de la newsletter. Vous pourrez vous réinscrire à tout moment.'), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

function renderMessage(success: boolean, message: string): string {
  const color = success ? '#16a34a' : '#dc2626';
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Newsletter — Atomic</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f8fafc;">
  <div style="max-width:420px;text-align:center;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="font-size:2.5rem;margin-bottom:.5rem;">${success ? '✅' : '⚠️'}</div>
    <p style="color:${color};font-size:1.125rem;font-weight:600;margin:0;">${message}</p>
    <p style="margin-top:1rem;"><a href="/" style="color:#6d28d9;">Retour à l'accueil</a></p>
  </div>
</body>
</html>`;
}
