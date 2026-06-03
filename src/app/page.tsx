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
        <h1 className="text-2xl font-bold">
          {`À quelle heure arrive ${targetName()} aujourd'hui ?`}
        </h1>
        <p className="mt-1 text-white/60">
          {formatDateLabel(date)} ·{" "}
          {closed ? (
            <span className="text-rose-300">paris clôturés</span>
          ) : (
            <span className="text-emerald-300">paris ouverts</span>
          )}
        </p>
      </section>

      {closed && actualMin !== null && (
        <section className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <p className="text-sm text-white/70">Heure d&apos;arrivée réelle</p>
          <p className="text-3xl font-bold text-emerald-300">{minutesToHHMM(actualMin)}</p>
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        {!user ? (
          <p className="text-white/70">
            <Link href="/login" className="text-indigo-300 underline">
              Connecte-toi
            </Link>{" "}
            pour placer ton pari du jour.
          </p>
        ) : closed ? (
          <p className="text-white/70">
            Les paris sont clôturés pour aujourd&apos;hui. Rendez-vous demain matin !
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              {myBet
                ? `Ton pari actuel : ${minutesToHHMM(myBet.predictedMin)}. Tu peux le modifier tant que les paris sont ouverts.`
                : "Tu n'as pas encore parié aujourd'hui."}
            </p>
            <BetForm defaultTime={minutesToHHMM(myBet?.predictedMin ?? 9 * 60)} />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Paris du jour <span className="text-white/40">({bets.length})</span>
        </h2>
        {bets.length === 0 ? (
          <p className="text-white/50">Aucun pari pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
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
                    isMe ? "bg-indigo-400/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {closed && (
                      <span className="w-5 text-center text-sm text-white/40">
                        {i + 1}
                      </span>
                    )}
                    <span className="font-medium">
                      {bet.user.name || bet.user.email || "Anonyme"}
                      {isMe && <span className="ml-1 text-xs text-indigo-300">(toi)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-white/80">
                      {minutesToHHMM(bet.predictedMin)}
                    </span>
                    {diff !== null && <span className="text-white/40">±{diff} min</span>}
                    {closed && (
                      <span className="w-14 text-right font-semibold text-emerald-300">
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
