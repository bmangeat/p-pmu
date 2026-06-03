"use client";

import { useActionState, useState } from "react";
import { placeBetAction, type ActionState } from "@/lib/actions";

export default function BetForm({
  defaultTime,
  defaultMode = "time",
}: {
  defaultTime?: string;
  defaultMode?: "time" | "absent";
}) {
  const [mode, setMode] = useState<"time" | "absent">(defaultMode);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    placeBetAction,
    {},
  );

  const tab = (value: "time" | "absent", label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        mode === value
          ? "bg-orange-500 text-white shadow-sm"
          : "text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />

      <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1">
        {tab("time", "Il sera là ⏱️")}
        {tab("absent", "Absent 🙅")}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {mode === "time" ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600">
            Heure d&apos;arrivée
            <input
              type="time"
              name="time"
              defaultValue={defaultTime}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-lg text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </label>
        ) : (
          <p className="text-sm text-zinc-500">
            Tu paries qu&apos;il ne viendra pas aujourd&apos;hui.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-2.5 font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-400 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Parier ! 🎲"}
        </button>
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm font-medium text-emerald-600">{state.message}</p>}
    </form>
  );
}
