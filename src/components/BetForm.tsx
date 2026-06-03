"use client";

import { useActionState } from "react";
import { placeBetAction, type ActionState } from "@/lib/actions";

export default function BetForm({ defaultTime }: { defaultTime?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    placeBetAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Ton pari (heure d&apos;arrivée)
        <input
          type="time"
          name="time"
          defaultValue={defaultTime}
          required
          className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-lg text-white [color-scheme:dark]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Parier"}
      </button>
      {state.error && <p className="w-full text-sm text-rose-300">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-emerald-300">{state.message}</p>}
    </form>
  );
}
