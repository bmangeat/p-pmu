"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeScore, hhmmToMinutes, todayDateString } from "@/lib/config";

export type ActionState = { ok?: boolean; error?: string; message?: string };

// Placer (ou modifier) son pari pour aujourd'hui.
export async function placeBetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Tu dois être connecté pour parier." };

  const min = hhmmToMinutes(String(formData.get("time") ?? ""));
  if (min === null) return { error: "Heure invalide. Utilise le format HH:mm." };

  const date = todayDateString();
  const day = await prisma.arrivalDay.upsert({
    where: { date },
    update: {},
    create: { date },
  });

  if (day.closed) {
    return { error: "Les paris sont clôturés pour aujourd'hui." };
  }

  await prisma.bet.upsert({
    where: { userId_dayId: { userId: session.user.id, dayId: day.id } },
    update: { predictedMin: min },
    create: { userId: session.user.id, dayId: day.id, predictedMin: min },
  });

  revalidatePath("/");
  return { ok: true, message: "Pari enregistré !" };
}

// Saisir l'heure d'arrivée réelle (admin) : calcule les scores et clôture le jour.
export async function setActualArrivalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.isAdmin) return { error: "Action réservée aux administrateurs." };

  const date = String(formData.get("date") ?? "").trim() || todayDateString();
  const min = hhmmToMinutes(String(formData.get("time") ?? ""));
  if (min === null) return { error: "Heure invalide. Utilise le format HH:mm." };

  const day = await prisma.arrivalDay.upsert({
    where: { date },
    update: { actualMin: min, closed: true },
    create: { date, actualMin: min, closed: true },
  });

  const bets = await prisma.bet.findMany({ where: { dayId: day.id } });
  await prisma.$transaction(
    bets.map((bet) =>
      prisma.bet.update({
        where: { id: bet.id },
        data: { points: computeScore(bet.predictedMin, min) },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/historique");
  revalidatePath("/admin");
  return { ok: true, message: `Heure réelle enregistrée, ${bets.length} pari(s) noté(s).` };
}

// Rouvrir un jour clôturé (admin) : efface l'heure réelle et les scores.
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
    data: { actualMin: null, closed: false },
  });

  revalidatePath("/");
  revalidatePath("/classement");
  revalidatePath("/historique");
  revalidatePath("/admin");
  return { ok: true, message: "Jour rouvert." };
}
