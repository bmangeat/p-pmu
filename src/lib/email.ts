import "server-only";

const APP_URL = process.env.AUTH_URL || "https://p-pmu.vercel.app";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

// Expéditeur : format "Nom <email>" ou juste "email" (via EMAIL_FROM).
function parseSender(): { name: string; email: string } | null {
  const raw = (process.env.EMAIL_FROM || "").trim();
  if (!raw) return null;
  const m = /^(.*)<(.+)>$/.exec(raw);
  if (m) return { name: m[1].trim() || "P-PMU", email: m[2].trim() };
  return { name: "P-PMU", email: raw };
}

function reminderHtml(name: string | null, target: string): string {
  const hello = name ? `Salut ${name},` : "Salut,";
  return `
  <div style="margin:0;padding:24px;background:#fffbeb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #fde68a;border-radius:16px;padding:28px;">
      <p style="font-size:22px;font-weight:800;margin:0 0 8px;">⏰ P-PMU</p>
      <p style="font-size:16px;margin:0 0 16px;">${hello}</p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px;">
        Tu n'as pas encore parié sur l'heure d'arrivée de <strong>${target}</strong> aujourd'hui.
        Les paris sont <strong>encore ouverts</strong> — file vite déposer le tien&nbsp;! 🎲
      </p>
      <a href="${APP_URL}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9999px;">
        Parier maintenant
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">
        Tu reçois cet email car tu as activé les rappels. Tu peux les désactiver dans ton profil P-PMU.
      </p>
    </div>
  </div>`;
}

// Envoie un email de rappel via Brevo.
// No-op (sans erreur) si BREVO_API_KEY ou EMAIL_FROM ne sont pas configurés.
export async function sendReminderEmail(
  to: string,
  name: string | null,
  target: string,
): Promise<{ ok?: boolean; skipped?: boolean; error?: unknown }> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = parseSender();
  if (!apiKey || !sender) {
    console.warn(`[email] BREVO_API_KEY/EMAIL_FROM manquant — rappel non envoyé à ${to}`);
    return { skipped: true };
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to, name: name ?? undefined }],
      subject: "⏰ P-PMU : ton pari du jour t'attend !",
      htmlContent: reminderHtml(name, target),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[email] échec Brevo (${res.status}):`, detail);
    return { error: detail || res.status };
  }
  return { ok: true };
}
