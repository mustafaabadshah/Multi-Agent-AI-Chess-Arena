import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StrategyChartProps {
  whiteStrategies: Record<string, number>;
  blackStrategies: Record<string, number>;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({
  whiteStrategies,
  blackStrategies,
}) => {
  // Combine all strategies
  const allKeys = Array.from(
    new Set([...Object.keys(whiteStrategies), ...Object.keys(blackStrategies)])
  );

  const data = allKeys
    .map((strat) => ({
      strategy: strat,
      White: whiteStrategies[strat] || 0,
      Black: blackStrategies[strat] || 0,
      total: (whiteStrategies[strat] || 0) + (blackStrategies[strat] || 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8); // Top 8 strategies

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-slate-500 font-mono text-xs border border-arena-border rounded-xl bg-arena-panel">
        No strategy telemetry recorded yet.
      </div>
    );
  }

  return (
    <div className="w-full h-64 p-3 bg-arena-panel rounded-xl border border-arena-border">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Strategy Distribution Comparison
        </span>
      </div>

      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <XAxis type="number" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis
              dataKey="strategy"
              type="category"
              stroke="#475569"
              tick={{ fontSize: 10, fill: '#cbd5e1' }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-2 rounded bg-arena-950 border border-arena-border text-xs font-mono shadow-xl">
                      <div className="font-bold text-slate-200">{item.strategy}</div>
                      <div className="text-cyan-400">White: {item.White} moves</div>
                      <div className="text-purple-400">Black: {item.Black} moves</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="White" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Black" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
