import { getLeaderboard } from "@/lib/data";

export const dynamic = "force-dynamic";

const medals = ["🥇", "🥈", "🥉"];

export default async function ClassementPage() {
  const entries = await getLeaderboard();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-zinc-900">🏆 Classement général</h1>

      {entries.length === 0 ? (
        <p className="text-zinc-400">
          Aucun score pour l&apos;instant. Les points apparaissent une fois qu&apos;un jour
          est clôturé.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
          {entries.map((e, i) => (
            <li
              key={e.userId}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                i === 0 ? "bg-amber-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-center text-lg font-semibold text-zinc-400">
                  {medals[i] ?? i + 1}
                </span>
                <span className="font-medium text-zinc-900">{e.name}</span>
                <span className="text-xs text-zinc-400">
                  {e.games} jour{e.games > 1 ? "s" : ""}
                </span>
              </div>
              <span className="font-mono text-lg font-bold text-emerald-600">
                {e.totalPoints} pts
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
