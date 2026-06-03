import Link from "next/link";
import { auth } from "@/auth";
import { getTodayState } from "@/lib/data";
import { formatDateLabel, minutesToHHMM, targetName } from "@/lib/config";
import BetForm from "@/components/BetForm";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;
  const { date, closed, actualMin, bets, myBet } = await getTodayState(user?.id);

  const ranked = closed
    ? [...bets].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    : bets;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-extrabold text-zinc-900">
          {`À quelle heure arrive ${targetName()} aujourd'hui ?`}
        </h1>
        <p className="mt-1 text-zinc-500">
          {formatDateLabel(date)} ·{" "}
          {closed ? (
            <span className="font-medium text-rose-500">paris clôturés</span>
          ) : (
            <span className="font-medium text-emerald-600">paris ouverts</span>
          )}
        </p>
      </section>

      {closed && actualMin !== null && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Heure d&apos;arrivée réelle</p>
          <p className="text-3xl font-extrabold text-emerald-600">
            {minutesToHHMM(actualMin)}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        {!user ? (
          <p className="text-zinc-600">
            <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-500">
              Connecte-toi
            </Link>{" "}
            pour placer ton pari du jour. 🎰
          </p>
        ) : closed ? (
          <p className="text-zinc-600">
            Les paris sont clôturés pour aujourd&apos;hui. Rendez-vous demain matin ! ☕
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              {myBet
                ? `Ton pari actuel : ${minutesToHHMM(myBet.predictedMin)}. Tu peux le modifier tant que les paris sont ouverts.`
                : "Tu n'as pas encore parié aujourd'hui."}
            </p>
            <BetForm defaultTime={minutesToHHMM(myBet?.predictedMin ?? 9 * 60)} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">
          Paris du jour <span className="text-zinc-400">({bets.length})</span>
        </h2>
        {bets.length === 0 ? (
          <p className="text-zinc-400">Aucun pari pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
            {ranked.map((bet, i) => {
              const isMe = bet.userId === user?.id;
              const diff =
                closed && actualMin !== null
                  ? Math.abs(bet.predictedMin - actualMin)
                  : null;
              return (
                <li
                  key={bet.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    isMe ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {closed && (
                      <span className="w-5 text-center text-sm font-semibold text-zinc-400">
                        {i + 1}
                      </span>
                    )}
                    <span className="font-medium text-zinc-900">
                      {bet.user.name || bet.user.email || "Anonyme"}
                      {isMe && <span className="ml-1 text-xs text-violet-600">(toi)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-zinc-700">
                      {minutesToHHMM(bet.predictedMin)}
                    </span>
                    {diff !== null && <span className="text-zinc-400">±{diff} min</span>}
                    {closed && (
                      <span className="w-14 text-right font-bold text-emerald-600">
                        {bet.points ?? 0} pts
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
