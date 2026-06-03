import { getHistory } from "@/lib/data";
import { formatDateLabel, minutesToHHMM, targetName } from "@/lib/config";
import ArrivalChart from "@/components/ArrivalChart";

export const dynamic = "force-dynamic";

export default async function HistoriquePage() {
  const history = await getHistory();

  const chartData = history.map((d) => ({
    label: formatDateLabel(d.date),
    min: d.actualMin,
  }));

  const avg =
    history.length > 0
      ? Math.round(history.reduce((s, d) => s + d.actualMin, 0) / history.length)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">📈 Historique des arrivées</h1>
        <p className="mt-1 text-zinc-500">
          Heure d&apos;arrivée de {targetName()} jour après jour.
          {avg !== null && (
            <>
              {" "}
              Moyenne : <span className="font-medium text-zinc-800">{minutesToHHMM(avg)}</span>.
            </>
          )}
        </p>
      </div>

      <ArrivalChart data={chartData} />

      {history.length > 0 && (
        <table className="w-full overflow-hidden rounded-2xl border border-amber-100 bg-white text-sm shadow-sm">
          <thead className="bg-amber-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-4 py-2 font-semibold">Arrivée</th>
              <th className="px-4 py-2 font-semibold">Gagnant</th>
              <th className="px-4 py-2 text-right font-semibold">Paris</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {[...history].reverse().map((d) => (
              <tr key={d.date}>
                <td className="px-4 py-2 text-zinc-700">{formatDateLabel(d.date)}</td>
                <td className="px-4 py-2 font-mono text-zinc-800">
                  {minutesToHHMM(d.actualMin)}
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {d.winnerName ? (
                    <>
                      {d.winnerName}{" "}
                      <span className="font-medium text-emerald-600">
                        ({d.winnerPoints} pts)
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-zinc-500">{d.betsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
