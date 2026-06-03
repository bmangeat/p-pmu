"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  scoreBet,
  hhmmToMinutes,
  todayDateString,
  isWeekend,
  targetName,
} from "@/lib/config";
import { regenerateValidationCode, verifyAndConsume } from "@/lib/validation-code";
import { sendReminderEmail } from "@/lib/email";

export type ActionState = { ok?: boolean; error?: string; message?: string };

// Valider son compte avec le code à usage unique (affiché sur /admin).
export async function verifyAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté." };

  const ok = await verifyAndConsume(session.user.id, String(formData.get("code") ?? ""));
  if (!ok) {
    return { error: "Code invalide. Demande le code à un admin (il change après usage)." };
  }

  redirect("/");
}

// Activer / désactiver les rappels par email pour l'utilisateur courant.
export async function setNotifyEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté." };

  const enabled = String(formData.get("enabled") ?? "") === "1";
  await prisma.user.update({
    where: { id: session.user.id },
    data: { notifyEmail: enabled },
  });

  revalidatePath("/profil");
  return {
    ok: true,
    message: enabled
      ? "Rappels par email activés."
      : "Rappels par email désactivés.",
  };
}

// Envoyer un email de test (admin) à sa propre adresse, pour vérifier la config Brevo.
export async function sendTestEmailAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const email = session.user.email;
  if (!email) return { error: "Ton compte n'a pas d'adresse email." };

  const r = await sendReminderEmail(email, session.user.name ?? null, targetName());
  if (r.skipped) {
    return { error: "Email non configuré (BREVO_API_KEY / EMAIL_FROM manquants sur Vercel)." };
  }
  if (r.error) {
    return { error: `Échec de l'envoi : ${String(r.error).slice(0, 200)}` };
  }
  return { ok: true, message: `Email de test envoyé à ${email} ✅` };
}

// Régénérer le code de validation (admin) : invalide l'ancien immédiatement.
export async function regenerateCodeAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };
  await regenerateValidationCode();
  revalidatePath("/admin");
  return { ok: true, message: "Nouveau code généré." };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/historique");
  revalidatePath("/admin");
}

// Placer (ou modifier) son pari pour aujourd'hui : une heure ou "absent".
export async function placeBetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté pour parier." };

  const mode = String(formData.get("mode") ?? "time");
  let predictedMin: number | null = null;
  if (mode === "absent") {
    predictedMin = null;
  } else {
    predictedMin = hhmmToMinutes(String(formData.get("time") ?? ""));
    if (predictedMin === null) {
      return { error: "Heure invalide. Utilise le format HH:mm." };
    }
  }

  const date = todayDateString();
  if (isWeekend(date)) return { error: "Pas de pari le week-end. 🛌" };

  const day = await prisma.arrivalDay.upsert({
    where: { date },
    update: {},
    create: { date },
  });

  if (day.suspended) return { error: "Les paris sont suspendus pour ce jour." };
  if (day.closed) return { error: "Les paris sont clôturés pour aujourd'hui." };

  await prisma.bet.upsert({
    where: { userId_dayId: { userId: session.user.id, dayId: day.id } },
    update: { predictedMin, predictedAbsent: mode === "absent" },
    create: {
      userId: session.user.id,
      dayId: day.id,
      predictedMin,
      predictedAbsent: mode === "absent",
    },
  });

  revalidatePath("/");
  return {
    ok: true,
    message: mode === "absent" ? "Pari « absent » enregistré !" : "Pari enregistré !",
  };
}

// Saisir le résultat (admin) : présent à une heure, ou absent. Calcule les scores.
export async function setActualArrivalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const date = String(formData.get("date") ?? "").trim() || todayDateString();
  const mode = String(formData.get("mode") ?? "time");

  let actualMin: number | null = null;
  const actualAbsent = mode === "absent";
  if (!actualAbsent) {
    actualMin = hhmmToMinutes(String(formData.get("time") ?? ""));
    if (actualMin === null) return { error: "Heure invalide. Utilise le format HH:mm." };
  }

  const day = await prisma.arrivalDay.upsert({
    where: { date },
    update: { actualMin, actualAbsent, closed: true, suspended: false },
    create: { date, actualMin, actualAbsent, closed: true },
  });

  const bets = await prisma.bet.findMany({ where: { dayId: day.id } });
  await prisma.$transaction(
    bets.map((bet) =>
      prisma.bet.update({
        where: { id: bet.id },
        data: {
          points: scoreBet(
            { predictedMin: bet.predictedMin, predictedAbsent: bet.predictedAbsent },
            { actualMin, actualAbsent },
          ),
        },
      }),
    ),
  );

  revalidateAll();
  return {
    ok: true,
    message: actualAbsent
      ? `Marqué absent, ${bets.length} pari(s) noté(s).`
      : `Heure réelle enregistrée, ${bets.length} pari(s) noté(s).`,
  };
}

// Suspendre / réactiver un jour (admin) : aucun pari, aucun point quand suspendu.
export async function toggleSuspendDayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const date = String(formData.get("date") ?? "").trim() || todayDateString();
  const suspend = String(formData.get("suspend") ?? "1") === "1";

  const day = await prisma.arrivalDay.upsert({
    where: { date },
    update: suspend
      ? { suspended: true, closed: false, actualMin: null, actualAbsent: false }
      : { suspended: false },
    create: { date, suspended: suspend },
  });

  // Un jour suspendu n'octroie aucun point : on efface les scores éventuels.
  if (suspend) {
    await prisma.bet.updateMany({ where: { dayId: day.id }, data: { points: null } });
  }

  revalidateAll();
  return { ok: true, message: suspend ? "Jour suspendu." : "Jour réactivé." };
}

// Rouvrir un jour clôturé (admin) : efface le résultat et les scores.
export async function reopenDayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const date = String(formData.get("date") ?? "").trim();
  if (!date) return { error: "Date manquante." };

  const day = await prisma.arrivalDay.findUnique({ where: { date } });
  if (!day) return { error: "Jour introuvable." };

  await prisma.bet.updateMany({ where: { dayId: day.id }, data: { points: null } });
  await prisma.arrivalDay.update({
    where: { id: day.id },
    data: { actualMin: null, actualAbsent: false, closed: false },
  });

  revalidateAll();
  return { ok: true, message: "Jour rouvert." };
}
