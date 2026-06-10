"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  label: string;
  value: number;
};

export function MetricChartCard({
  title,
  value,
  href,
  actionLabel = "Ver detalle",
  data,
  valuePrefix = "",
}: {
  title: string;
  value: string;
  href: string;
  actionLabel?: string;
  data: ChartPoint[];
  valuePrefix?: string;
}) {
  const gradientId = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800">{title}</h2>
          <p className="mt-2 text-3xl font-black tracking-normal text-slate-950">{value}</p>
        </div>
        <Link href={href} className="text-xs font-black text-cyan-700 hover:text-cyan-800">
          {actionLabel}
        </Link>
      </div>

      <div className="mt-6 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eef2f7" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={46} />
            <Tooltip
              cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
              contentStyle={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                boxShadow: "0 18px 35px rgba(15, 23, 42, 0.12)",
              }}
              formatter={(chartValue) => [`${valuePrefix}${Number(chartValue).toLocaleString("es-CO")}`, title]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0284c7"
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 3, stroke: "#ffffff", fill: "#0284c7" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
