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
        <h1 className="text-2xl font-extrabold text-zinc-900">Admin</h1>
        <p className="text-zinc-600">
          Accès réservé aux administrateurs.{" "}
          <Link href="/" className="font-semibold text-orange-600 hover:text-orange-500">
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
        <h1 className="text-2xl font-extrabold text-zinc-900">⚙️ Espace admin</h1>
        <p className="mt-1 text-zinc-500">
          Saisis l&apos;heure d&apos;arrivée réelle de {targetName()}. Cela clôture les
          paris du jour et calcule les scores.
        </p>
      </div>

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">
          Saisir une heure d&apos;arrivée
        </h2>
        <AdminForm
          defaultDate={today}
          defaultTime={
            todayDay?.actualMin != null ? minutesToHHMM(todayDay.actualMin) : "09:00"
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Jours récents</h2>
        {days.length === 0 ? (
          <p className="text-zinc-400">Aucun jour enregistré.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
            {days.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="text-zinc-700">{formatDateLabel(d.date)}</span>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-500">{d._count.bets} pari(s)</span>
                  {d.actualMin != null ? (
                    <span className="font-mono text-emerald-600">
                      {minutesToHHMM(d.actualMin)}
                    </span>
                  ) : (
                    <span className="text-zinc-400">non saisie</span>
                  )}
                  {d.closed ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
                      clôturé
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      ouvert
                    </span>
                  )}
                  {d.closed && (
                    <form action={reopen}>
                      <input type="hidden" name="date" value={d.date} />
                      <button className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100">
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
