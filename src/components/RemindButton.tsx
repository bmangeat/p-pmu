"use client";

import { useActionState } from "react";
import { remindArrivalBettorsAction, type ActionState } from "@/lib/actions";

export default function RemindButton() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    remindArrivalBettorsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-violet-600 px-5 py-2.5 font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? "Envoi…" : "📣 Relancer les participants"}
      </button>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-600">{state.message}</p>}
    </form>
  );
}
