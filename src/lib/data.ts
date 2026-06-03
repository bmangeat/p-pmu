import { prisma } from "@/lib/prisma";
import { todayDateString } from "@/lib/config";

// État du jour courant : le jour, tous les paris, et le pari de l'utilisateur.
export async function getTodayState(userId?: string) {
  const date = todayDateString();
  const day = await prisma.arrivalDay.findUnique({
    where: { date },
    include: {
      bets: {
        include: { user: true },
        orderBy: { predictedMin: "asc" },
      },
    },
  });

  const bets = day?.bets ?? [];
  const myBet = userId ? bets.find((b) => b.userId === userId) ?? null : null;

  return {
    date,
    closed: day?.closed ?? false,
    actualMin: day?.actualMin ?? null,
    bets,
    myBet,
  };
}

export type LeaderboardEntry = {
  userId: string;
  name: string;
  image: string | null;
  totalPoints: number;
  games: number;
};

// Classement global : somme des points par joueur (jours notés uniquement).
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const grouped = await prisma.bet.groupBy({
    by: ["userId"],
    where: { points: { not: null } },
    _sum: { points: true },
    _count: { _all: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const u = userById.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name || u?.email || "Anonyme",
        image: u?.image ?? null,
        totalPoints: g._sum.points ?? 0,
        games: g._count._all,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// Historique des jours notés (pour le graphique et le tableau).
export async function getHistory() {
  const days = await prisma.arrivalDay.findMany({
    where: { actualMin: { not: null } },
    orderBy: { date: "asc" },
    include: { bets: { include: { user: true } } },
  });

  return days.map((day) => {
    const winner = day.bets.reduce<(typeof day.bets)[number] | null>((best, b) => {
      if (b.points === null) return best;
      if (!best || (best.points ?? -1) < b.points) return b;
      return best;
    }, null);

    return {
      date: day.date,
      actualMin: day.actualMin as number,
      betsCount: day.bets.length,
      winnerName: winner ? winner.user.name || winner.user.email || "Anonyme" : null,
      winnerPoints: winner?.points ?? null,
    };
  });
}
