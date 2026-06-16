import { prisma } from "@/lib/prisma";
import {
  ARRIVAL_BET_KEY,
  isPastBetDeadline,
  isWeekend,
  pickBetKey,
  todayDateString,
} from "@/lib/config";

// Clés de paris masqués à un utilisateur.
export async function getHiddenBetKeys(userId: string): Promise<Set<string>> {
  const rows = await prisma.hiddenBet.findMany({
    where: { userId },
    select: { betKey: true },
  });
  return new Set(rows.map((r) => r.betKey));
}

export async function isBetHidden(userId: string, betKey: string): Promise<boolean> {
  const row = await prisma.hiddenBet.findUnique({
    where: { betKey_userId: { betKey, userId } },
  });
  return !!row;
}

// État du jour courant : le jour, tous les paris, et le pari de l'utilisateur.
export async function getTodayState(userId?: string) {
  const date = todayDateString();
  const day = await prisma.arrivalDay.findUnique({
    where: { date },
    include: {
      bets: {
        include: { user: true },
        orderBy: [{ predictedAbsent: "asc" }, { predictedMin: "asc" }],
      },
    },
  });

  const bets = day?.bets ?? [];
  const myBet = userId ? bets.find((b) => b.userId === userId) ?? null : null;

  return {
    date,
    weekend: isWeekend(date),
    suspended: day?.suspended ?? false,
    closed: day?.closed ?? false,
    actualMin: day?.actualMin ?? null,
    actualAbsent: day?.actualAbsent ?? false,
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

// Classement global : somme des points (paris d'arrivée + votes des défis).
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [betGroups, voteGroups] = await Promise.all([
    prisma.bet.groupBy({
      by: ["userId"],
      where: { points: { not: null } },
      _sum: { points: true },
      _count: { _all: true },
    }),
    prisma.vote.groupBy({
      by: ["userId"],
      where: { points: { not: null } },
      _sum: { points: true },
      _count: { _all: true },
    }),
  ]);

  const agg = new Map<string, { points: number; games: number }>();
  const add = (userId: string, points: number, games: number) => {
    const e = agg.get(userId) ?? { points: 0, games: 0 };
    e.points += points;
    e.games += games;
    agg.set(userId, e);
  };
  for (const g of betGroups) add(g.userId, g._sum.points ?? 0, g._count._all);
  for (const g of voteGroups) add(g.userId, g._sum.points ?? 0, g._count._all);

  const users = await prisma.user.findMany({
    where: { id: { in: [...agg.keys()] } },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return [...agg.entries()]
    .map(([userId, { points, games }]) => {
      const u = userById.get(userId);
      return {
        userId,
        name: u?.name || u?.email || "Anonyme",
        image: u?.image ?? null,
        totalPoints: points,
        games,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export type ArrivalStatus = "weekend" | "suspended" | "closed" | "deadline" | "open";

// Données du hub d'accueil : résumé du pari d'arrivée + défis ouverts/terminés.
// Les paris masqués à l'utilisateur sont filtrés (sauf pour les admins).
export async function getHubData(userId: string, isAdmin: boolean) {
  const hidden = isAdmin ? new Set<string>() : await getHiddenBetKeys(userId);

  const arrival = await getTodayState(userId);
  const arrivalStatus: ArrivalStatus = arrival.weekend
    ? "weekend"
    : arrival.suspended
      ? "suspended"
      : arrival.closed
        ? "closed"
        : isPastBetDeadline()
          ? "deadline"
          : "open";
  const arrivalHidden = hidden.has(ARRIVAL_BET_KEY);

  const openGames = (
    await prisma.pickGame.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { votes: true } },
        votes: { where: { userId }, select: { candidateId: true } },
      },
    })
  ).filter((g) => !hidden.has(pickBetKey(g.id)));

  const closedGames = (
    await prisma.pickGame.findMany({
      where: { status: "closed" },
      orderBy: { closedAt: "desc" },
      take: 10,
      include: {
        candidates: { select: { id: true, name: true } },
        _count: { select: { votes: true } },
      },
    })
  ).filter((g) => !hidden.has(pickBetKey(g.id)));

  return { arrival, arrivalStatus, arrivalHidden, openGames, closedGames };
}

// Liste des utilisateurs + matrice de visibilité des paris (pour l'admin).
export async function getUsersWithVisibility() {
  const [users, games, hidden] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        verified: true,
        active: true,
        notifyEmail: true,
      },
    }),
    prisma.pickGame.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true },
    }),
    prisma.hiddenBet.findMany({ select: { betKey: true, userId: true } }),
  ]);

  const hiddenByUser = new Map<string, Set<string>>();
  for (const h of hidden) {
    const set = hiddenByUser.get(h.userId) ?? new Set<string>();
    set.add(h.betKey);
    hiddenByUser.set(h.userId, set);
  }

  const bets = [
    { key: ARRIVAL_BET_KEY, label: "🏁 Heure d'arrivée" },
    ...games.map((g) => ({
      key: pickBetKey(g.id),
      label: `🗳️ ${g.title}${g.status === "closed" ? " (clôturé)" : ""}`,
    })),
  ];

  return { users, bets, hiddenByUser };
}

// Détail d'un défi : candidats, décompte des votes, vote de l'utilisateur, gagnant.
export async function getPickGame(id: string, userId: string) {
  const game = await prisma.pickGame.findUnique({
    where: { id },
    include: {
      candidates: { orderBy: { name: "asc" } },
      votes: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!game) return null;

  const counts = new Map<string, number>();
  for (const v of game.votes) {
    counts.set(v.candidateId, (counts.get(v.candidateId) ?? 0) + 1);
  }
  const myVote = game.votes.find((v) => v.userId === userId)?.candidateId ?? null;

  return { game, counts, myVote };
}

// Historique des jours résolus (présent ou absent) pour le tableau et le graphique.
export async function getHistory() {
  const days = await prisma.arrivalDay.findMany({
    where: { closed: true },
    orderBy: { date: "asc" },
    include: { bets: { include: { user: true } } },
  });

  return days.map((day) => {
    const winner = day.bets.reduce<(typeof day.bets)[number] | null>((best, b) => {
      if (b.points === null || b.points <= 0) return best;
      if (!best || (best.points ?? -1) < b.points) return b;
      return best;
    }, null);

    return {
      date: day.date,
      actualMin: day.actualMin,
      actualAbsent: day.actualAbsent,
      betsCount: day.bets.length,
      winnerName: winner ? winner.user.name || winner.user.email || "Anonyme" : null,
      winnerPoints: winner?.points ?? null,
    };
  });
}
