"use client";
import React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/* ------------------------------------------------------------------ */
/* Qrafiklər (recharts) — kit/media.tsx-dən gecikmiş yüklənir            */
/* ------------------------------------------------------------------ */

const CHART_COLORS = ["#0f766e", "#f59e0b", "#3b82f6", "#e11d48", "#7c3aed", "#059669", "#64748b"];

function ChartBox({ height = 260, children }: { height?: number; children: React.ReactElement }) {
  return (
    <div className="kit-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, xKey, bars, height, stacked }: { data: Record<string, unknown>[]; xKey: string; bars: { key: string; label: string }[]; height?: number; stacked?: boolean }) {
  return (
    <ChartBox height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={stacked ? 0 : [4, 4, 0, 0]} stackId={stacked ? "s" : undefined} />)}
      </BarChart>
    </ChartBox>
  );
}

export function LinesChart({ data, xKey, lines, height, area }: { data: Record<string, unknown>[]; xKey: string; lines: { key: string; label: string }[]; height?: number; area?: boolean }) {
  return (
    <ChartBox height={height}>
      {area ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip />
          {lines.map((l, i) => <Area key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />)}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((l, i) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={CHART_COLORS[i]} strokeWidth={2} dot={false} />)}
        </LineChart>
      )}
    </ChartBox>
  );
}

export function DonutChart({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ChartBox height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartBox>
  );
}
