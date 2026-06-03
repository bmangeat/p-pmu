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
    return <p className="text-white/50">Pas encore de données à afficher.</p>;
  }

  const mins = data.map((d) => d.min);
  const lo = Math.floor((Math.min(...mins) - 15) / 15) * 15;
  const hi = Math.ceil((Math.max(...mins) + 15) / 15) * 15;

  return (
    <div className="h-72 w-full rounded-xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
          />
          <YAxis
            domain={[lo, hi]}
            tickFormatter={fmt}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            width={56}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v)), "Arrivée"]}
            contentStyle={{
              background: "#0b1020",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              color: "#e7e9f3",
            }}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ r: 3, fill: "#34d399" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
