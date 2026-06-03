import { getLeaderboard } from "@/lib/data";

export const dynamic = "force-dynamic";

const medals = ["🥇", "🥈", "🥉"];

export default async function ClassementPage() {
  const entries = await getLeaderboard();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Classement général</h1>

      {entries.length === 0 ? (
        <p className="text-white/50">
          Aucun score pour l&apos;instant. Les points apparaissent une fois qu&apos;un jour
          est clôturé.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {entries.map((e, i) => (
            <li
              key={e.userId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-center text-lg">{medals[i] ?? i + 1}</span>
                <span className="font-medium">{e.name}</span>
                <span className="text-xs text-white/40">
                  {e.games} jour{e.games > 1 ? "s" : ""}
                </span>
              </div>
              <span className="font-mono text-lg font-semibold text-emerald-300">
                {e.totalPoints} pts
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
