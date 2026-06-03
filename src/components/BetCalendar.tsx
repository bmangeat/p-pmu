import { prisma } from "@/lib/prisma";
import { isWeekend, OFFICE_TZ, todayDateString } from "@/lib/config";

type Status = "today" | "future" | "past" | "done" | "weekend" | "suspended";

const STYLES: Record<Status, string> = {
  today: "bg-emerald-500 text-white font-bold ring-2 ring-emerald-300",
  future: "bg-emerald-50 text-emerald-700",
  past: "text-zinc-300",
  done: "bg-zinc-100 text-zinc-400",
  weekend: "bg-rose-50 text-rose-300",
  suspended: "bg-rose-100 text-rose-500",
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default async function BetCalendar() {
  const today = todayDateString();
  const [yStr, mStr] = today.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-12
  const monthPrefix = `${yStr}-${mStr}`;

  const rows = await prisma.arrivalDay.findMany({
    where: { date: { startsWith: monthPrefix } },
    select: { date: true, suspended: true, closed: true },
  });
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=dim
  const leading = (firstDow + 6) % 7; // grille lundi -> dimanche

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: OFFICE_TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(`${today}T12:00:00`));

  function statusOf(dateStr: string): Status {
    const rec = byDate.get(dateStr);
    if (rec?.suspended) return "suspended";
    if (isWeekend(dateStr)) return "weekend";
    if (rec?.closed) return "done";
    if (dateStr < today) return "past";
    if (dateStr === today) return "today";
    return "future";
  }

  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">📅 Planning des paris</h2>
        <span className="text-sm font-medium capitalize text-zinc-500">{monthLabel}</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const dateStr = ymd(year, month, day);
          const status = statusOf(dateStr);
          return (
            <div
              key={dateStr}
              className={`flex h-9 items-center justify-center rounded-lg text-sm ${STYLES[status]}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> pari ouvert
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-zinc-200" /> clôturé / passé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-rose-200" /> week-end / suspendu
        </span>
      </div>
    </div>
  );
}
