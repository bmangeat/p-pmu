"use client";

import { useActionState } from "react";
import { verifyAccountAction, type ActionState } from "@/lib/actions";

export default function VerifyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    verifyAccountAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        placeholder="123456"
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-center text-2xl font-mono tracking-[0.4em] text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-orange-500 px-4 py-2.5 font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-400 disabled:opacity-50"
      >
        {pending ? "Vérification…" : "Valider mon compte"}
      </button>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}
