"use client";

import { useActionState } from "react";
import { setNotifyEmailAction, type ActionState } from "@/lib/actions";

export default function ProfileForm({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setNotifyEmailAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">Rappels par email</p>
          <p className="text-sm text-zinc-500">
            Reçois un email à 9h30 si tu n&apos;as pas encore parié (jours ouverts).
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-pressed={enabled}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-emerald-500" : "bg-zinc-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}
