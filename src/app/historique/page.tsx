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
        <h1 className="text-2xl font-bold">Historique des arrivées</h1>
        <p className="mt-1 text-white/60">
          Heure d&apos;arrivée de {targetName()} jour après jour.
          {avg !== null && (
            <>
              {" "}
              Moyenne : <span className="text-white/80">{minutesToHHMM(avg)}</span>.
            </>
          )}
        </p>
      </div>

      <ArrivalChart data={chartData} />

      {history.length > 0 && (
        <table className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Arrivée</th>
              <th className="px-4 py-2 font-medium">Gagnant</th>
              <th className="px-4 py-2 text-right font-medium">Paris</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {[...history].reverse().map((d) => (
              <tr key={d.date}>
                <td className="px-4 py-2">{formatDateLabel(d.date)}</td>
                <td className="px-4 py-2 font-mono">{minutesToHHMM(d.actualMin)}</td>
                <td className="px-4 py-2">
                  {d.winnerName ? (
                    <>
                      {d.winnerName}{" "}
                      <span className="text-emerald-300">({d.winnerPoints} pts)</span>
                    </>
                  ) : (
                    <span className="text-white/40">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-white/60">{d.betsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
