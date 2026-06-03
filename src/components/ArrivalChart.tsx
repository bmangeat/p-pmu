"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { label: string; min: number };

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ArrivalChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-white p-6 text-zinc-400 shadow-sm">
        Pas encore de données à afficher.
      </div>
    );
  }

  const mins = data.map((d) => d.min);
  const lo = Math.floor((Math.min(...mins) - 15) / 15) * 15;
  const hi = Math.ceil((Math.max(...mins) + 15) / 15) * 15;

  return (
    <div className="h-72 w-full rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(0,0,0,0.5)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(0,0,0,0.12)" }}
          />
          <YAxis
            domain={[lo, hi]}
            tickFormatter={fmt}
            tick={{ fill: "rgba(0,0,0,0.5)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(0,0,0,0.12)" }}
            width={56}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v)), "Arrivée"]}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #fde68a",
              borderRadius: 12,
              color: "#27272a",
            }}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="#f97316"
            strokeWidth={3}
            dot={{ r: 4, fill: "#f97316" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
