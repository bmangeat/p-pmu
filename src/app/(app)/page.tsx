import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHubData, type ArrivalStatus } from "@/lib/data";
import { targetName } from "@/lib/config";

export const dynamic = "force-dynamic";

const ARRIVAL_BADGE: Record<ArrivalStatus, { label: string; cls: string }> = {
  open: { label: "Paris ouverts", cls: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Clôturé", cls: "bg-rose-100 text-rose-600" },
  suspended: { label: "Suspendu", cls: "bg-zinc-200 text-zinc-600" },
  weekend: { label: "Week-end", cls: "bg-rose-100 text-rose-500" },
};

export default async function HubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;
  const { arrival, arrivalStatus, openGames, closedGames } = await getHubData(userId);

  const badge = ARRIVAL_BADGE[arrivalStatus];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-extrabold text-zinc-900">🎰 Paris en cours</h1>
        <p className="mt-1 text-zinc-500">Choisis un pari et tente ta chance.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Carte pari d'arrivée */}
        <Link
          href="/arrivee"
          className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="text-3xl">🏁</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <h2 className="font-bold text-zinc-900 group-hover:text-orange-600">
            Heure d&apos;arrivée
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {`À quelle heure arrive ${targetName()} ?`}
          </p>
          <p className="mt-3 text-sm font-medium text-zinc-700">
            {arrivalStatus === "open"
              ? arrival.myBet
                ? "✅ Tu as parié aujourd'hui"
                : "⏳ Tu n'as pas encore parié"
              : "Reviens plus tard"}
          </p>
        </Link>

        {/* Cartes des défis ouverts */}
        {openGames.map((g) => (
          <Link
            key={g.id}
            href={`/defis/${g.id}`}
            className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-3xl">🗳️</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Ouvert
              </span>
            </div>
            <h2 className="font-bold text-zinc-900 group-hover:text-violet-600">
              {g.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {g._count.votes} vote{g._count.votes > 1 ? "s" : ""}
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-700">
              {g.votes.length > 0 ? "✅ Tu as voté" : "⏳ Tu n'as pas encore voté"}
            </p>
          </Link>
        ))}
      </div>

      {closedGames.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">Défis terminés</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
            {closedGames.map((g) => {
              const winner = g.candidates.find((c) => c.id === g.winnerCandidateId);
              return (
                <li key={g.id} className="px-4 py-3">
                  <Link href={`/defis/${g.id}`} className="flex items-center justify-between gap-3">
                    <span className="font-medium text-zinc-900">{g.title}</span>
                    <span className="text-sm text-zinc-500">
                      Gagnant :{" "}
                      <span className="font-medium text-emerald-600">
                        {winner?.name ?? "—"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
