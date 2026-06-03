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
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600">
        Date
        <input
          type="date"
          name="date"
          defaultValue={defaultDate}
          required
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600">
        Heure d&apos;arrivée réelle
        <input
          type="time"
          name="time"
          defaultValue={defaultTime}
          required
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-lg text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-orange-500 px-5 py-2.5 font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-400 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Valider & calculer les scores"}
      </button>
      {state.error && <p className="w-full text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="w-full text-sm font-medium text-emerald-600">{state.message}</p>}
    </form>
  );
}
