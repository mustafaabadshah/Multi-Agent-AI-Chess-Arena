import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { StyleIndicators } from '../types';

interface StyleRadarChartProps {
  whiteStyle: StyleIndicators;
  blackStyle: StyleIndicators;
  whiteModel: string;
  blackModel: string;
}

export const StyleRadarChart: React.FC<StyleRadarChartProps> = ({
  whiteStyle,
  blackStyle,
  whiteModel,
  blackModel,
}) => {
  const data = [
    { trait: 'Aggression', White: whiteStyle.aggression, Black: blackStyle.aggression },
    { trait: 'Risk', White: whiteStyle.risk, Black: blackStyle.risk },
    { trait: 'Tactical', White: whiteStyle.tactical_tendency, Black: blackStyle.tactical_tendency },
    { trait: 'Defensive', White: whiteStyle.defensive_tendency, Black: blackStyle.defensive_tendency },
    { trait: 'King Safety', White: whiteStyle.king_safety_priority, Black: blackStyle.king_safety_priority },
    { trait: 'Material', White: whiteStyle.material_preference, Black: blackStyle.material_preference },
    { trait: 'Positional', White: whiteStyle.positional_preference, Black: blackStyle.positional_preference },
  ];

  return (
    <div className="w-full h-80 p-4 bg-arena-panel rounded-xl border border-arena-border">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Agent Style Profiles
        </span>
        <span className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
          Experimental style indicators
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mb-2 px-1">
        Transparent heuristic metrics derived from recorded moves and reported factors.
      </p>

      <div className="w-full h-60">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="trait" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#cbd5e1' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="p-2 rounded bg-arena-950 border border-arena-border text-xs font-mono shadow-xl">
                      <div className="font-bold text-slate-200">{d.trait}</div>
                      <div className="text-cyan-400">White: {d.White} / 100</div>
                      <div className="text-purple-400">Black: {d.Black} / 100</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Radar
              name={`White (${whiteModel})`}
              dataKey="White"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.35}
            />
            <Radar
              name={`Black (${blackModel})`}
              dataKey="Black"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
