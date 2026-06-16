"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  scoreBet,
  hhmmToMinutes,
  minutesToHHMM,
  todayDateString,
  isWeekend,
  nowMinutesInOffice,
  targetName,
  SCORE,
  ARRIVAL_BET_KEY,
  pickBetKey,
} from "@/lib/config";
import { getBetDeadlineMin, setBetDeadlineMin } from "@/lib/settings";
import { regenerateValidationCode, verifyAndConsume } from "@/lib/validation-code";
import { sendReminderEmail } from "@/lib/email";
import { sendPush } from "@/lib/push";

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

// ---- Défis (vote sur une liste de personnes) ----

function revalidateGames() {
  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/admin");
}

// Créer un défi avec une liste de personnes (admin).
export async function createPickGameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Donne un titre au défi." };
  const description = String(formData.get("description") ?? "").trim() || null;

  const names = Array.from(
    new Set(
      String(formData.get("candidates") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  if (names.length < 2) return { error: "Ajoute au moins 2 personnes (une par ligne)." };

  await prisma.pickGame.create({
    data: {
      title,
      description,
      candidates: { create: names.map((name) => ({ name })) },
    },
  });

  revalidateGames();
  return { ok: true, message: "Défi créé." };
}

// Modifier le titre / la description d'un défi (admin).
export async function updatePickGameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!gameId || !title) return { error: "Le titre est obligatoire." };
  const description = String(formData.get("description") ?? "").trim() || null;

  await prisma.pickGame.update({
    where: { id: gameId },
    data: { title, description },
  });

  revalidatePath(`/defis/${gameId}`);
  revalidateGames();
  return { ok: true, message: "Défi mis à jour." };
}

// Afficher / masquer aux participants qui a voté pour qui (admin).
export async function setVotersVisibilityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Défi manquant." };
  const show = String(formData.get("show") ?? "") === "1";

  await prisma.pickGame.update({ where: { id: gameId }, data: { showVoters: show } });
  revalidatePath(`/defis/${gameId}`);
  revalidateGames();
  return { ok: true, message: show ? "Votants visibles." : "Votants masqués." };
}

// Renommer une personne d'un défi (admin).
export async function renameCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!candidateId || !name) return { error: "Nom manquant." };

  await prisma.candidate.update({ where: { id: candidateId }, data: { name } });
  revalidatePath(`/defis/${gameId}`);
  revalidateGames();
  return { ok: true, message: "Personne renommée." };
}

// Supprimer une personne d'un défi (admin) — uniquement si le défi est ouvert.
export async function deleteCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return { error: "Personne manquante." };

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { game: true },
  });
  if (!candidate) return { error: "Personne introuvable." };
  if (candidate.game.status !== "open") {
    return { error: "Rouvre le défi pour modifier la liste des personnes." };
  }

  await prisma.candidate.delete({ where: { id: candidateId } });
  revalidatePath(`/defis/${candidate.gameId}`);
  revalidateGames();
  return { ok: true, message: "Personne supprimée." };
}

// Ajouter une personne à un défi (admin).
export async function addCandidateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!gameId || !name) return { error: "Nom manquant." };

  await prisma.candidate.create({ data: { gameId, name } });
  revalidatePath(`/defis/${gameId}`);
  revalidateGames();
  return { ok: true, message: "Personne ajoutée." };
}

// Voter (ou changer son vote) pour un candidat (utilisateur connecté).
export async function voteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté pour voter." };

  const gameId = String(formData.get("gameId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!gameId || !candidateId) return { error: "Choix manquant." };

  const game = await prisma.pickGame.findUnique({ where: { id: gameId } });
  if (!game) return { error: "Défi introuvable." };
  if (game.status !== "open") return { error: "Les votes sont clôturés pour ce défi." };

  const hiddenPick = await prisma.hiddenBet.findUnique({
    where: { betKey_userId: { betKey: pickBetKey(gameId), userId: session.user.id } },
  });
  if (hiddenPick) return { error: "Ce défi ne t'est pas accessible." };

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, gameId },
  });
  if (!candidate) return { error: "Candidat invalide." };

  await prisma.vote.upsert({
    where: { gameId_userId: { gameId, userId: session.user.id } },
    update: { candidateId },
    create: { gameId, userId: session.user.id, candidateId },
  });

  revalidatePath(`/defis/${gameId}`);
  revalidatePath("/");
  return { ok: true, message: "Vote enregistré !" };
}

// Désigner le gagnant et clôturer un défi (admin) : calcule les scores.
export async function resolvePickGameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!gameId || !candidateId) return { error: "Sélectionne le gagnant." };

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, gameId },
  });
  if (!candidate) return { error: "Candidat invalide." };

  const votes = await prisma.vote.findMany({ where: { gameId } });
  await prisma.$transaction([
    prisma.pickGame.update({
      where: { id: gameId },
      data: { status: "closed", winnerCandidateId: candidateId, closedAt: new Date() },
    }),
    ...votes.map((v) =>
      prisma.vote.update({
        where: { id: v.id },
        data: { points: v.candidateId === candidateId ? SCORE.PICK_CORRECT : 0 },
      }),
    ),
  ]);

  revalidatePath(`/defis/${gameId}`);
  revalidateGames();
  return { ok: true, message: `Gagnant désigné, ${votes.length} vote(s) noté(s).` };
}

// Rouvrir un défi clôturé (admin) : efface gagnant et scores.
export async function reopenPickGameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Défi manquant." };

  await prisma.vote.updateMany({ where: { gameId }, data: { points: null } });
  await prisma.pickGame.update({
    where: { id: gameId },
    data: { status: "open", winnerCandidateId: null, closedAt: null },
  });

  revalidatePath(`/defis/${gameId}`);
  revalidateGames();
  return { ok: true, message: "Défi rouvert." };
}

// Supprimer un défi (admin).
export async function deletePickGameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Défi manquant." };

  await prisma.hiddenBet.deleteMany({ where: { betKey: pickBetKey(gameId) } });
  await prisma.pickGame.delete({ where: { id: gameId } });
  revalidateGames();
  return { ok: true, message: "Défi supprimé." };
}

// Activer / désactiver un compte utilisateur (admin) : révoque l'accès si désactivé.
export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Utilisateur manquant." };
  const active = String(formData.get("active") ?? "") === "1";

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: active ? "Compte réactivé." : "Compte désactivé." };
}

// Masquer / afficher un pari pour un utilisateur précis (admin).
export async function setBetVisibilityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const betKey = String(formData.get("betKey") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!betKey || !userId) return { error: "Paramètres manquants." };
  const hide = String(formData.get("hide") ?? "") === "1";

  if (hide) {
    await prisma.hiddenBet.upsert({
      where: { betKey_userId: { betKey, userId } },
      update: {},
      create: { betKey, userId },
    });
  } else {
    await prisma.hiddenBet.deleteMany({ where: { betKey, userId } });
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/");
  return { ok: true, message: hide ? "Pari masqué." : "Pari affiché." };
}

// ---- Notifications push ----

type PushSubInput = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

// Enregistrer l'abonnement push du navigateur courant pour l'utilisateur.
export async function subscribePushAction(
  sub: PushSubInput,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté." };

  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth_ = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth_) return { error: "Abonnement invalide." };

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.user.id, p256dh, auth: auth_ },
    create: { userId: session.user.id, endpoint, p256dh, auth: auth_ },
  });
  return { ok: true, message: "Notifications activées." };
}

// Supprimer un abonnement push (désactivation).
export async function unsubscribePushAction(endpoint: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté." };
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });
  }
  return { ok: true, message: "Notifications désactivées." };
}

// Envoyer une notification de test à ses propres appareils.
export async function sendTestPushAction(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté." };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });
  if (subs.length === 0) return { error: "Active d'abord les notifications." };

  let sent = 0;
  for (const s of subs) {
    const r = await sendPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      { title: "P-PMU 🎲", body: "Notification de test — tout fonctionne !", url: "/" },
    );
    if (r.ok) sent++;
    if (r.gone) await prisma.pushSubscription.delete({ where: { id: s.id } });
    if (r.skipped) return { error: "Push non configuré côté serveur (clés VAPID)." };
  }
  return { ok: true, message: `Notification de test envoyée (${sent}).` };
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

  const hiddenArrival = await prisma.hiddenBet.findUnique({
    where: { betKey_userId: { betKey: ARRIVAL_BET_KEY, userId: session.user.id } },
  });
  if (hiddenArrival) return { error: "Ce pari ne t'est pas accessible." };

  const date = todayDateString();
  if (isWeekend(date)) return { error: "Pas de pari le week-end. 🛌" };
  const deadlineMin = await getBetDeadlineMin();
  if (nowMinutesInOffice() >= deadlineMin) {
    return {
      error: `Trop tard ! Les paris ferment à ${minutesToHHMM(deadlineMin)}. 🔒`,
    };
  }

  const day = await prisma.arrivalDay.upsert({
    where: { date },
    update: {},
    create: { date },
  });

  if (day.suspended) return { error: "Les paris sont suspendus pour ce jour." };
  if (day.closed) return { error: "Les paris sont clôturés pour aujourd'hui." };

  // Le pari est définitif : on refuse toute modification une fois soumis.
  const existing = await prisma.bet.findUnique({
    where: { userId_dayId: { userId: session.user.id, dayId: day.id } },
    select: { id: true },
  });
  if (existing) return { error: "Ton pari est définitif, tu ne peux plus le modifier." };

  await prisma.bet.create({
    data: {
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

// Définir l'heure limite des paris (admin).
export async function setBetDeadlineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const min = hhmmToMinutes(String(formData.get("time") ?? ""));
  if (min === null) return { error: "Heure invalide. Utilise le format HH:mm." };

  await setBetDeadlineMin(min);

  revalidatePath("/");
  revalidatePath("/arrivee");
  revalidatePath("/admin");
  return { ok: true, message: `Heure limite des paris fixée à ${minutesToHHMM(min)}.` };
}

// Relancer par notification push les participants n'ayant pas encore parié aujourd'hui (admin).
export async function remindArrivalBettorsAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const date = todayDateString();
  if (isWeekend(date)) return { error: "Pas de pari le week-end. 🛌" };

  const day = await prisma.arrivalDay.findUnique({
    where: { date },
    include: { bets: { select: { userId: true } } },
  });
  if (day?.suspended) return { error: "Jour suspendu : aucun rappel à envoyer." };
  if (day?.closed) return { error: "Les paris sont déjà clôturés." };

  const deadlineMin = await getBetDeadlineMin();
  if (nowMinutesInOffice() >= deadlineMin) {
    return { error: `Trop tard : les paris sont fermés (${minutesToHHMM(deadlineMin)}).` };
  }

  const alreadyBet = new Set((day?.bets ?? []).map((b) => b.userId));

  const hiddenRows = await prisma.hiddenBet.findMany({
    where: { betKey: ARRIVAL_BET_KEY },
    select: { userId: true },
  });
  const hiddenUserIds = new Set(hiddenRows.map((h) => h.userId));

  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { id: true, active: true } } },
  });

  const target = targetName();
  const payload = {
    title: "⏰ P-PMU",
    body: `N'oublie pas de parier sur l'heure d'arrivée de ${target} ! ⏱️`,
    url: "/arrivee",
  };

  let sent = 0;
  const notifiedUsers = new Set<string>();
  for (const s of subs) {
    const uid = s.user.id;
    if (!s.user.active || alreadyBet.has(uid) || hiddenUserIds.has(uid)) continue;
    const r = await sendPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      payload,
    );
    if (r.ok) {
      sent++;
      notifiedUsers.add(uid);
    }
    if (r.gone) await prisma.pushSubscription.delete({ where: { id: s.id } });
  }

  if (notifiedUsers.size === 0) {
    return {
      ok: true,
      message:
        "Personne à relancer : tout le monde a parié, ou aucun retardataire n'est abonné aux notifications.",
    };
  }
  return {
    ok: true,
    message: `${notifiedUsers.size} participant(s) relancé(s) par notification (${sent} appareil(s)).`,
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
