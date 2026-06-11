import "server-only";
import webpush from "web-push";

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@p-pmu.app",
      publicKey,
      privateKey,
    );
    configured = true;
  }
  return true;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string };

// Envoie une notification push. `gone: true` = abonnement expiré (à supprimer).
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<{ ok?: boolean; gone?: boolean; skipped?: boolean; error?: unknown }> {
  if (!ensureConfigured()) return { skipped: true };
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (e: unknown) {
    const code = (e as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) return { gone: true };
    console.error("[push] échec d'envoi:", e);
    return { error: e };
  }
}
