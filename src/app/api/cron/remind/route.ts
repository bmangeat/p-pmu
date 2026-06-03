import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWeekend, targetName, todayDateString } from "@/lib/config";
import { sendReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Rappel quotidien (déclenché par Vercel Cron ~9h30) : email aux utilisateurs
// ayant activé les notifications et n'ayant pas encore parié, si les paris sont ouverts.
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

  const users = await prisma.user.findMany({
    where: { notifyEmail: true, email: { not: null } },
    select: { id: true, name: true, email: true },
  });
  const toNotify = users.filter((u) => !alreadyBet.has(u.id));

  const target = targetName();
  let sent = 0;
  for (const u of toNotify) {
    const r = await sendReminderEmail(u.email as string, u.name, target);
    if (r.ok) sent++;
  }

  return NextResponse.json({ date, candidates: toNotify.length, sent });
}
