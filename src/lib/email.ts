import "server-only";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "P-PMU <onboarding@resend.dev>";
const APP_URL = process.env.AUTH_URL || "https://p-pmu.vercel.app";

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

// Envoie un email de rappel. No-op (sans erreur) si RESEND_API_KEY n'est pas configuré.
export async function sendReminderEmail(
  to: string,
  name: string | null,
  target: string,
): Promise<{ ok?: boolean; skipped?: boolean; error?: unknown }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY manquant — rappel non envoyé à ${to}`);
    return { skipped: true };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "⏰ P-PMU : ton pari du jour t'attend !",
    html: reminderHtml(name, target),
  });

  if (error) {
    console.error("[email] échec d'envoi:", error);
    return { error };
  }
  return { ok: true };
}
