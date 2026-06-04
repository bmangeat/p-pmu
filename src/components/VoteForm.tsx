"use client";

import { useActionState } from "react";
import { voteAction, type ActionState } from "@/lib/actions";

type Candidate = { id: string; name: string };

export default function VoteForm({
  gameId,
  candidates,
  myVote,
}: {
  gameId: string;
  candidates: Candidate[];
  myVote: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    voteAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gameId" value={gameId} />
      <div className="space-y-2">
        {candidates.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-50"
          >
            <input
              type="radio"
              name="candidateId"
              value={c.id}
              defaultChecked={myVote === c.id}
              required
              className="h-4 w-4 accent-violet-600"
            />
            <span className="font-medium text-zinc-900">{c.name}</span>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-violet-600 px-6 py-2.5 font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : myVote ? "Changer mon vote" : "Voter 🗳️"}
      </button>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-600">{state.message}</p>}
    </form>
  );
}
