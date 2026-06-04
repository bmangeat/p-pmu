import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  addCandidateAction,
  deleteCandidateAction,
  deletePickGameAction,
  renameCandidateAction,
  reopenPickGameAction,
  resolvePickGameAction,
  updatePickGameAction,
} from "@/lib/actions";
import CreatePickGameForm from "@/components/CreatePickGameForm";

export const dynamic = "force-dynamic";

export default async function AdminDefisPage() {
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

  const games = await prisma.pickGame.findMany({
    orderBy: { createdAt: "desc" },
    include: { candidates: { orderBy: { name: "asc" } }, _count: { select: { votes: true } } },
  });

  async function resolve(formData: FormData) {
    "use server";
    await resolvePickGameAction({}, formData);
  }
  async function reopen(formData: FormData) {
    "use server";
    await reopenPickGameAction({}, formData);
  }
  async function del(formData: FormData) {
    "use server";
    await deletePickGameAction({}, formData);
  }
  async function addCand(formData: FormData) {
    "use server";
    await addCandidateAction({}, formData);
  }
  async function updateGame(formData: FormData) {
    "use server";
    await updatePickGameAction({}, formData);
  }
  async function renameCand(formData: FormData) {
    "use server";
    await renameCandidateAction({}, formData);
  }
  async function delCand(formData: FormData) {
    "use server";
    await deleteCandidateAction({}, formData);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">🗳️ Gérer les défis</h1>
        <p className="mt-1 text-zinc-500">
          Crée des paris « vote sur une liste de personnes » et désigne les gagnants.{" "}
          <Link href="/admin" className="text-orange-600 hover:text-orange-500">
            ← Espace admin
          </Link>
        </p>
      </div>

      <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Nouveau défi</h2>
        <CreatePickGameForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Défis existants</h2>
        {games.length === 0 ? (
          <p className="text-zinc-400">Aucun défi pour l&apos;instant.</p>
        ) : (
          games.map((g) => {
            const closed = g.status === "closed";
            const winner = g.candidates.find((c) => c.id === g.winnerCandidateId);
            return (
              <div
                key={g.id}
                className="space-y-4 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-zinc-900">{g.title}</h3>
                    <p className="text-sm text-zinc-500">
                      {g._count.votes} vote(s) · {g.candidates.length} personne(s)
                      {closed && winner && (
                        <>
                          {" "}
                          · gagnant :{" "}
                          <span className="font-medium text-emerald-600">{winner.name}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      closed
                        ? "bg-rose-100 text-rose-600"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {closed ? "clôturé" : "ouvert"}
                  </span>
                </div>

                {/* Édition titre / description */}
                <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                    ✏️ Modifier le titre / la description
                  </summary>
                  <form action={updateGame} className="mt-3 space-y-2">
                    <input type="hidden" name="gameId" value={g.id} />
                    <input
                      name="title"
                      defaultValue={g.title}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
                    />
                    <input
                      name="description"
                      defaultValue={g.description ?? ""}
                      placeholder="Description (optionnel)"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
                    />
                    <button className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
                      Enregistrer
                    </button>
                  </form>
                </details>

                {/* Édition de la liste des personnes (défi ouvert) */}
                {!closed && (
                  <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                      👥 Modifier les personnes ({g.candidates.length})
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {g.candidates.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center gap-2">
                          <form action={renameCand} className="flex items-center gap-2">
                            <input type="hidden" name="gameId" value={g.id} />
                            <input type="hidden" name="candidateId" value={c.id} />
                            <input
                              name="name"
                              defaultValue={c.name}
                              required
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900"
                            />
                            <button className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                              Renommer
                            </button>
                          </form>
                          <form action={delCand}>
                            <input type="hidden" name="candidateId" value={c.id} />
                            <button
                              className="rounded-full px-2 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                              title="Supprimer"
                            >
                              ✕
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {!closed ? (
                  <div className="flex flex-wrap items-end gap-4">
                    <form action={resolve} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="gameId" value={g.id} />
                      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600">
                        Désigner le gagnant
                        <select
                          name="candidateId"
                          required
                          defaultValue=""
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
                        >
                          <option value="" disabled>
                            Choisir une personne…
                          </option>
                          {g.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
                        Clôturer & noter
                      </button>
                    </form>

                    <form action={addCand} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="gameId" value={g.id} />
                      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600">
                        Ajouter une personne
                        <input
                          name="name"
                          required
                          placeholder="Prénom"
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
                        />
                      </label>
                      <button className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                        Ajouter
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={reopen}>
                    <input type="hidden" name="gameId" value={g.id} />
                    <button className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                      Rouvrir
                    </button>
                  </form>
                )}

                <form action={del}>
                  <input type="hidden" name="gameId" value={g.id} />
                  <button className="text-xs text-rose-500 hover:underline">
                    Supprimer ce défi
                  </button>
                </form>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
