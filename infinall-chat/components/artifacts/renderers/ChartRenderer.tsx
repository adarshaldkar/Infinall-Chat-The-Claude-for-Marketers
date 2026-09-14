"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ChartDataPayload } from "@/lib/artifacts/types";
import { BarChart3 } from "lucide-react";

interface ChartRendererProps {
  content: string;
}

const DEFAULT_COLORS = ["#22d3ee", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function ChartRenderer({ content }: ChartRendererProps) {
  const chartConfig = useMemo<ChartDataPayload | null>(() => {
    try {
      let clean = content.trim();
      if (clean.startsWith("```json")) {
        clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
      } else if (clean.startsWith("```")) {
        clean = clean.replace(/^```\w*\s*/i, "").replace(/```\s*$/i, "");
      }
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }, [content]);

  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm gap-2">
        <BarChart3 className="w-8 h-8 text-zinc-600" />
        <p>Invalid or streaming chart data format</p>
      </div>
    );
  }

  const { type = "bar", data, series, xAxisKey = "name", title } = chartConfig;

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6 overflow-y-auto">
      {title && (
        <h3 className="text-lg font-bold text-zinc-100 mb-6 font-['Outfit'] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          {title}
        </h3>
      )}

      <div className="w-full h-[400px] min-h-[350px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={12} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  color: "#f4f4f5",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              {series.map((s, idx) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.label || s.dataKey}
                  stroke={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={12} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  color: "#f4f4f5",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              {series.map((s, idx) => (
                <Area
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.label || s.dataKey}
                  stroke={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                  fill={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xAxisKey} stroke="#71717a" fontSize={12} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  color: "#f4f4f5",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              {series.map((s, idx) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.label || s.dataKey}
                  fill={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
