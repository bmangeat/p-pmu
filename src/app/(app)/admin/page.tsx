import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  regenerateCodeAction,
  reopenDayAction,
  toggleSuspendDayAction,
} from "@/lib/actions";
import {
  formatDateLabel,
  minutesToHHMM,
  targetName,
  todayDateString,
} from "@/lib/config";
import { getValidationCode } from "@/lib/validation-code";
import AdminForm from "@/components/AdminForm";
import TestEmailButton from "@/components/TestEmailButton";

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
  const validationCode = await getValidationCode();
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
  async function toggleSuspend(formData: FormData) {
    "use server";
    await toggleSuspendDayAction({}, formData);
  }
  async function regenerate() {
    "use server";
    await regenerateCodeAction({}, new FormData());
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">⚙️ Espace admin</h1>
        <p className="mt-1 text-zinc-500">
          Saisis le résultat du jour (présent à une heure, ou absent) — cela clôture les
          paris et calcule les scores. Tu peux aussi suspendre un jour sans pari.
        </p>
        <Link
          href="/admin/defis"
          className="mt-2 inline-block font-semibold text-violet-600 hover:text-violet-500"
        >
          🗳️ Gérer les défis (votes sur liste) →
        </Link>
      </div>

      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
        <h2 className="text-lg font-bold text-zinc-900">🔐 Code de validation</h2>
        <p className="mt-1 text-sm text-zinc-500">
          À communiquer à un nouveau participant pour valider son compte.{" "}
          <strong>Usage unique</strong> : un nouveau code est généré après chaque
          validation.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <p className="font-mono text-4xl font-extrabold tracking-[0.3em] text-violet-700">
            {validationCode}
          </p>
          <form action={regenerate}>
            <button className="rounded-full border border-violet-300 px-4 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-100">
              Régénérer
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-zinc-900">📧 Rappels par email</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Vérifie la configuration Brevo en t&apos;envoyant un email de rappel.
        </p>
        <TestEmailButton />
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Résultat du jour</h2>
        <AdminForm
          defaultDate={today}
          defaultTime={
            todayDay?.actualMin != null ? minutesToHHMM(todayDay.actualMin) : "09:00"
          }
        />
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-zinc-900">Suspendre un jour</h2>
        <p className="mb-3 text-sm text-zinc-500">
          {`Pour les jours où ${targetName()} n'est pas attendu (congé, télétravail…) : aucun pari, aucun point.`}
        </p>
        <form action={toggleSuspend} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="suspend" value="1" />
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600">
            Date à suspendre
            <input
              type="date"
              name="date"
              defaultValue={today}
              required
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </label>
          <button className="rounded-full bg-zinc-800 px-5 py-2.5 font-semibold text-white hover:bg-zinc-700">
            Suspendre ce jour
          </button>
        </form>
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
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="text-zinc-700">{formatDateLabel(d.date)}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-zinc-500">{d._count.bets} pari(s)</span>

                  {d.suspended ? (
                    <span className="text-zinc-400">—</span>
                  ) : d.actualAbsent ? (
                    <span className="font-medium text-amber-600">absent</span>
                  ) : d.actualMin != null ? (
                    <span className="font-mono text-emerald-600">
                      {minutesToHHMM(d.actualMin)}
                    </span>
                  ) : (
                    <span className="text-zinc-400">non saisi</span>
                  )}

                  {d.suspended ? (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      suspendu
                    </span>
                  ) : d.closed ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
                      clôturé
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      ouvert
                    </span>
                  )}

                  {d.suspended ? (
                    <form action={toggleSuspend}>
                      <input type="hidden" name="date" value={d.date} />
                      <input type="hidden" name="suspend" value="0" />
                      <button className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100">
                        Réactiver
                      </button>
                    </form>
                  ) : d.closed ? (
                    <form action={reopen}>
                      <input type="hidden" name="date" value={d.date} />
                      <button className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100">
                        Rouvrir
                      </button>
                    </form>
                  ) : (
                    <form action={toggleSuspend}>
                      <input type="hidden" name="date" value={d.date} />
                      <input type="hidden" name="suspend" value="1" />
                      <button className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100">
                        Suspendre
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
