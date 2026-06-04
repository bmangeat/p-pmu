import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPickGame } from "@/lib/data";
import VoteForm from "@/components/VoteForm";

export const dynamic = "force-dynamic";

export default async function DefiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const data = await getPickGame(id, session.user.id);

  if (!data) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold text-zinc-900">Défi introuvable</h1>
        <Link href="/" className="font-semibold text-orange-600 hover:text-orange-500">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const { game, counts, myVote } = data;
  const closed = game.status === "closed";
  const voters = [...game.votes].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold text-zinc-900">🗳️ {game.title}</h1>
          {closed ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
              clôturé
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ouvert
            </span>
          )}
        </div>
        {game.description && <p className="mt-1 text-zinc-500">{game.description}</p>}
      </section>

      {!closed && (
        <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm text-zinc-500">
            {myVote ? "Tu peux changer ton vote tant que c'est ouvert." : "Pour qui votes-tu ?"}
          </p>
          <VoteForm gameId={game.id} candidates={game.candidates} myVote={myVote} />
        </section>
      )}

      {/* Décompte des votes par candidat */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Résultats des votes</h2>
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
          {game.candidates.map((c) => {
            const isWinner = closed && c.id === game.winnerCandidateId;
            return (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  isWinner ? "bg-emerald-50" : ""
                }`}
              >
                <span className="font-medium text-zinc-900">
                  {c.name}
                  {isWinner && <span className="ml-2 text-sm text-emerald-600">🏆 gagnant</span>}
                  {myVote === c.id && (
                    <span className="ml-2 text-xs text-violet-600">(ton vote)</span>
                  )}
                </span>
                <span className="text-sm text-zinc-500">
                  {counts.get(c.id) ?? 0} vote{(counts.get(c.id) ?? 0) > 1 ? "s" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Qui a voté quoi — visible si l'admin l'autorise (et toujours pour les admins) */}
      {voters.length > 0 && !game.showVoters && !session.user.isAdmin && (
        <p className="text-sm text-zinc-400">
          🔒 Votes anonymes : qui a voté pour qui n&apos;est pas affiché.
        </p>
      )}
      {voters.length > 0 && (game.showVoters || session.user.isAdmin) && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">
            Votants <span className="text-zinc-400">({voters.length})</span>
            {!game.showVoters && (
              <span className="ml-2 text-xs font-normal text-amber-600">
                (masqué pour les participants)
              </span>
            )}
          </h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
            {voters.map((v) => {
              const cand = game.candidates.find((c) => c.id === v.candidateId);
              const isMe = v.userId === session!.user.id;
              return (
                <li
                  key={v.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                    isMe ? "bg-orange-50" : ""
                  }`}
                >
                  <span className="font-medium text-zinc-900">
                    {v.user.name || v.user.email || "Anonyme"}
                    {isMe && <span className="ml-1 text-xs text-violet-600">(toi)</span>}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-600">{cand?.name ?? "—"}</span>
                    {closed && (
                      <span className="w-14 text-right font-bold text-emerald-600">
                        {v.points ?? 0} pts
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
