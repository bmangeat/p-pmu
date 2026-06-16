import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTodayState, isBetHidden } from "@/lib/data";
import {
  ARRIVAL_BET_KEY,
  BET_DEADLINE_MIN,
  formatDateLabel,
  isPastBetDeadline,
  minutesToHHMM,
  targetName,
} from "@/lib/config";
import BetForm from "@/components/BetForm";
import BetCalendar from "@/components/BetCalendar";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;
  if (user && !user.isAdmin && (await isBetHidden(user.id, ARRIVAL_BET_KEY))) {
    redirect("/");
  }
  const { date, weekend, suspended, closed, actualMin, actualAbsent, bets, myBet } =
    await getTodayState(user?.id);

  const deadline = minutesToHHMM(BET_DEADLINE_MIN);
  const deadlinePassed = isPastBetDeadline();

  const ranked = closed
    ? [...bets].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    : bets;

  const predictionLabel = (b: (typeof bets)[number]) =>
    b.predictedAbsent ? "Absent 🙅" : minutesToHHMM(b.predictedMin ?? 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-extrabold text-zinc-900">
          {`À quelle heure arrive ${targetName()} aujourd'hui ?`}
        </h1>
        <p className="mt-1 text-zinc-500">
          {formatDateLabel(date)} ·{" "}
          {weekend ? (
            <span className="font-medium text-rose-500">week-end</span>
          ) : suspended ? (
            <span className="font-medium text-zinc-500">jour suspendu</span>
          ) : closed ? (
            <span className="font-medium text-rose-500">paris clôturés</span>
          ) : deadlinePassed ? (
            <span className="font-medium text-rose-500">{`paris fermés (après ${deadline})`}</span>
          ) : (
            <span className="font-medium text-emerald-600">{`paris ouverts jusqu'à ${deadline}`}</span>
          )}
        </p>
      </section>

      {closed && (
        <section
          className={`rounded-2xl border p-4 ${
            actualAbsent
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          {actualAbsent ? (
            <>
              <p className="text-sm text-amber-700">Résultat du jour</p>
              <p className="text-3xl font-extrabold text-amber-600">Absent 🙅</p>
            </>
          ) : (
            <>
              <p className="text-sm text-emerald-700">Heure d&apos;arrivée réelle</p>
              <p className="text-3xl font-extrabold text-emerald-600">
                {minutesToHHMM(actualMin ?? 0)}
              </p>
            </>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        {weekend ? (
          <p className="text-zinc-600">
            Pas de pari le week-end — on se retrouve lundi ! 🛌
          </p>
        ) : suspended ? (
          <p className="text-zinc-600">
            {`Pas de pari aujourd'hui — ${targetName()} n'est pas attendu (jour suspendu). 🏖️`}
          </p>
        ) : !user ? (
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
        ) : myBet ? (
          <div className="space-y-1">
            <p className="text-sm text-zinc-500">
              Ton pari est enregistré et définitif :
            </p>
            <p className="text-2xl font-extrabold text-orange-600">
              {predictionLabel(myBet)}
            </p>
          </div>
        ) : deadlinePassed ? (
          <p className="text-zinc-600">
            {`Trop tard ! Les paris ferment à ${deadline}. Reviens demain matin avant ${deadline}. ⏰`}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">
              {`Tu n'as pas encore parié aujourd'hui. À placer avant ${deadline}, et c'est définitif. 🔒`}
            </p>
            <BetForm defaultTime={minutesToHHMM(9 * 60)} />
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
                closed && !actualAbsent && actualMin !== null && !bet.predictedAbsent
                  ? Math.abs((bet.predictedMin ?? 0) - actualMin)
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
                    <span className="font-mono text-zinc-700">{predictionLabel(bet)}</span>
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

      <BetCalendar />
    </div>
  );
}
