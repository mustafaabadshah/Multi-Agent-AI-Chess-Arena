import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface EvaluationChartProps {
  timeline: {
    ply: number;
    move_number: number;
    color: string;
    san: string;
    eval: number;
    quality?: string;
    cpl?: number;
  }[];
  onPointClick?: (ply: number) => void;
}

export const EvaluationChart: React.FC<EvaluationChartProps> = ({
  timeline,
  onPointClick,
}) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 font-mono text-xs border border-arena-border rounded-xl bg-arena-panel">
        No evaluation data available yet.
      </div>
    );
  }

  // Cap eval at +/- 10 for clean visualization
  const data = timeline.map((pt) => ({
    ...pt,
    cappedEval: Math.max(-10, Math.min(10, pt.eval)),
    label: `${pt.move_number}${pt.color === 'white' ? '.' : '...'} ${pt.san}`,
  }));

  return (
    <div className="w-full h-56 p-3 bg-arena-panel rounded-xl border border-arena-border">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Stockfish Evaluation Curve
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          + White Advantage / - Black Advantage
        </span>
      </div>

      <div className="w-full h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const ply = e.activePayload[0].payload.ply;
                if (onPointClick) onPointClick(ply);
              }
            }}
          >
            <defs>
              <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="ply"
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
            />
            <YAxis
              domain={[-10, 10]}
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
            />
            <ReferenceLine y={0} stroke="#38bdf8" strokeDasharray="3 3" opacity={0.5} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  return (
                    <div className="p-2 rounded bg-arena-950 border border-arena-border text-xs font-mono shadow-xl">
                      <div className="font-bold text-slate-200">{pt.label}</div>
                      <div className="text-cyan-300">
                        Eval: {pt.eval > 0 ? `+${pt.eval.toFixed(2)}` : pt.eval.toFixed(2)}
                      </div>
                      {pt.quality && <div className="text-purple-300">Quality: {pt.quality}</div>}
                      {pt.cpl !== undefined && <div className="text-amber-300">Loss: {pt.cpl} cp</div>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="cappedEval"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#evalGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
