"use client";

import { useActionState, useRef, useEffect } from "react";
import { createPickGameAction, type ActionState } from "@/lib/actions";

export default function CreatePickGameForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPickGameAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input
        name="title"
        required
        placeholder="Titre du défi (ex. Prochaine personne à quitter la boîte ?)"
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      <input
        name="description"
        placeholder="Description (optionnel)"
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      <textarea
        name="candidates"
        required
        rows={5}
        placeholder={"Une personne par ligne :\nAlice\nBob\nCharlie"}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-violet-600 px-5 py-2.5 font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? "Création…" : "Créer le défi"}
      </button>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-600">{state.message}</p>}
    </form>
  );
}
