"use client";

import { useActionState } from "react";
import { sendTestEmailAction, type ActionState } from "@/lib/actions";

export default function TestEmailButton() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    sendTestEmailAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
      >
        {pending ? "Envoi…" : "📧 Envoyer un email de test"}
      </button>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-600">{state.message}</p>}
    </form>
  );
}
