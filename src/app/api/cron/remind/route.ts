import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ARRIVAL_BET_KEY, isWeekend, targetName, todayDateString } from "@/lib/config";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

// Rappel quotidien (déclenché par Vercel Cron ~9h30) : notification push aux utilisateurs
// abonnés et n'ayant pas encore parié, si le pari d'arrivée est ouvert.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = todayDateString();
  if (isWeekend(date)) return NextResponse.json({ skipped: "weekend", date });

  const day = await prisma.arrivalDay.findUnique({
    where: { date },
    include: { bets: { select: { userId: true } } },
  });
  if (day?.suspended) return NextResponse.json({ skipped: "suspended", date });
  if (day?.closed) return NextResponse.json({ skipped: "closed", date });

  const alreadyBet = new Set((day?.bets ?? []).map((b) => b.userId));

  // Utilisateurs à qui le pari d'arrivée est masqué.
  const hiddenRows = await prisma.hiddenBet.findMany({
    where: { betKey: ARRIVAL_BET_KEY },
    select: { userId: true },
  });
  const hiddenUserIds = new Set(hiddenRows.map((h) => h.userId));

  // Tous les abonnements push des comptes actifs.
  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { id: true, active: true } } },
  });

  const target = targetName();
  const payload = {
    title: "⏰ P-PMU",
    body: `Tu n'as pas encore parié sur l'heure d'arrivée de ${target} !`,
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

  return NextResponse.json({ date, sent, users: notifiedUsers.size });
}
