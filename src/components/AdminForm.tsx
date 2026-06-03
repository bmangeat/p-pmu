"use client";

import { useActionState } from "react";
import { setActualArrivalAction, type ActionState } from "@/lib/actions";

export default function AdminForm({
  defaultDate,
  defaultTime,
}: {
  defaultDate: string;
  defaultTime?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setActualArrivalAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Date
        <input
          type="date"
          name="date"
          defaultValue={defaultDate}
          required
          className="rounded-md border border-white/15 bg-white/10 px-3 py-2 [color-scheme:dark]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-white/70">
        Heure d&apos;arrivée réelle
        <input
          type="time"
          name="time"
          defaultValue={defaultTime}
          required
          className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-lg [color-scheme:dark]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-500 px-4 py-2 font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Valider & calculer les scores"}
      </button>
      {state.error && <p className="w-full text-sm text-rose-300">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-emerald-300">{state.message}</p>}
    </form>
  );
}
