"use client";

import { useEffect, useState } from "react";
import {
  subscribePushAction,
  unsubscribePushAction,
  sendTestPushAction,
} from "@/lib/actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "off" | "on";

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !VAPID_PUBLIC
      ) {
        setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Permission refusée par le navigateur.");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const res = await subscribePushAction(sub.toJSON() as never);
      if (res.error) setMsg(res.error);
      else setState("on");
    } catch {
      setMsg("Impossible d'activer les notifications sur cet appareil.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribePushAction(endpoint);
      }
      setState("off");
    } catch {
      setMsg("Erreur lors de la désactivation.");
    }
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    const res = await sendTestPushAction();
    setMsg(res.error ?? res.message ?? null);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">Notifications push</p>
          <p className="text-sm text-zinc-500">
            Reçois un rappel à 9h30 si tu n&apos;as pas encore parié (jours ouverts).
          </p>
        </div>
        {state === "loading" ? (
          <span className="text-sm text-zinc-400">…</span>
        ) : state === "unsupported" ? (
          <span className="text-sm text-zinc-400">non supporté</span>
        ) : (
          <button
            onClick={state === "on" ? disable : enable}
            disabled={busy}
            aria-pressed={state === "on"}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              state === "on" ? "bg-emerald-500" : "bg-zinc-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                state === "on" ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        )}
      </div>

      {state === "unsupported" && (
        <p className="text-sm text-amber-600">
          Ton navigateur ne gère pas les notifications. Sur iPhone, installe d&apos;abord
          P-PMU sur l&apos;écran d&apos;accueil (Partager → « Sur l&apos;écran d&apos;accueil »).
        </p>
      )}
      {state === "on" && (
        <button
          onClick={test}
          disabled={busy}
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          Envoyer une notif de test
        </button>
      )}
      {msg && <p className="text-sm text-zinc-600">{msg}</p>}
    </div>
  );
}
