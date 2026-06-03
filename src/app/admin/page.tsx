import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reopenDayAction } from "@/lib/actions";
import {
  formatDateLabel,
  minutesToHHMM,
  targetName,
  todayDateString,
} from "@/lib/config";
import AdminForm from "@/components/AdminForm";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-white/60">
          Accès réservé aux administrateurs.{" "}
          <Link href="/" className="text-indigo-300 underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    );
  }

  const today = todayDateString();
  const days = await prisma.arrivalDay.findMany({
    orderBy: { date: "desc" },
    take: 14,
    include: { _count: { select: { bets: true } } },
  });
  const todayDay = days.find((d) => d.date === today);

  async function reopen(formData: FormData) {
    "use server";
    await reopenDayAction({}, formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Espace admin</h1>
        <p className="mt-1 text-white/60">
          Saisis l&apos;heure d&apos;arrivée réelle de {targetName()}. Cela clôture les
          paris du jour et calcule les scores.
        </p>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 text-lg font-semibold">Saisir une heure d&apos;arrivée</h2>
        <AdminForm
          defaultDate={today}
          defaultTime={
            todayDay?.actualMin != null ? minutesToHHMM(todayDay.actualMin) : "09:00"
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Jours récents</h2>
        {days.length === 0 ? (
          <p className="text-white/50">Aucun jour enregistré.</p>
        ) : (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {days.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span>{formatDateLabel(d.date)}</span>
                <div className="flex items-center gap-4">
                  <span className="text-white/60">{d._count.bets} pari(s)</span>
                  {d.actualMin != null ? (
                    <span className="font-mono text-emerald-300">
                      {minutesToHHMM(d.actualMin)}
                    </span>
                  ) : (
                    <span className="text-white/40">non saisie</span>
                  )}
                  {d.closed ? (
                    <span className="rounded bg-rose-400/20 px-2 py-0.5 text-xs text-rose-300">
                      clôturé
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-300">
                      ouvert
                    </span>
                  )}
                  {d.closed && (
                    <form action={reopen}>
                      <input type="hidden" name="date" value={d.date} />
                      <button className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/70 hover:bg-white/10">
                        Rouvrir
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
