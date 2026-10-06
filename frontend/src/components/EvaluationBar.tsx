import React from 'react';

interface EvaluationBarProps {
  score: number; // positive = White advantage, negative = Black advantage
  depth?: number;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ score, depth }) => {
  // Convert pawn score to percentage [0, 100] using standard sigmoid curve
  const getPercentage = (evalScore: number): number => {
    if (evalScore >= 100) return 100;
    if (evalScore <= -100) return 0;
    const winChance = 1 / (1 + Math.pow(10, -evalScore / 4));
    return Math.max(5, Math.min(95, winChance * 100));
  };

  const whitePercentage = getPercentage(score);
  const formattedScore = score > 0 ? `+${score.toFixed(2)}` : score < 0 ? score.toFixed(2) : '0.00';

  // Layman advantage description
  const advantageText =
    score > 2.5
      ? 'White is winning'
      : score > 0.5
      ? 'White is ahead'
      : score < -2.5
      ? 'Black is winning'
      : score < -0.5
      ? 'Black is ahead'
      : 'Even match';

  return (
    <div 
      className="group relative flex flex-col items-center select-none w-9 h-full min-h-[440px] bg-arena-950 border border-arena-border rounded-lg overflow-hidden shadow-lg cursor-help"
      title={`Advantage: ${advantageText} (${formattedScore} pawns). Calculated by Stockfish 19.`}
    >
      {/* Black indicator label at top */}
      <div className="absolute top-1 inset-x-0 flex flex-col items-center pointer-events-none z-20">
        <span className="text-[9px] font-bold text-slate-400">⚫ B</span>
        {depth && <span className="text-[8px] font-mono text-slate-400">d{depth}</span>}
      </div>

      {/* Black evaluation section (top) */}
      <div 
        className="w-full bg-slate-900 transition-all duration-500 ease-out"
        style={{ height: `${100 - whitePercentage}%` }}
      />

      {/* Equality middle marker with dashed line */}
      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-cyan-400/50 z-10" />

      {/* White evaluation section (bottom) */}
      <div 
        className="w-full bg-slate-100 transition-all duration-500 ease-out"
        style={{ height: `${whitePercentage}%` }}
      />

      {/* White indicator label at bottom */}
      <div className="absolute bottom-1 inset-x-0 flex flex-col items-center pointer-events-none z-20">
        <span className="text-[9px] font-bold text-slate-700">⚪ W</span>
      </div>

      {/* Score Badge */}
      <div 
        className="absolute inset-x-0 flex flex-col items-center pointer-events-none z-20 transition-all duration-500"
        style={{ top: `${Math.max(15, Math.min(80, 100 - whitePercentage))}%` }}
      >
        <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow-md border ${
          score >= 0 
            ? 'bg-slate-900 text-white border-slate-700' 
            : 'bg-white text-slate-950 border-slate-300'
        }`}>
          {formattedScore}
        </span>
      </div>

      {/* Hover tooltip for beginners */}
      <div className="absolute left-11 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1 w-44 p-2 bg-arena-900 border border-cyan-700/60 rounded-lg shadow-xl text-[11px] text-slate-200 z-50 pointer-events-none">
        <span className="font-bold text-cyan-300 flex items-center gap-1">
          📊 Engine Advantage
        </span>
        <span className="text-slate-300">
          {advantageText} (Advantage: <strong className="text-white font-mono">{formattedScore} pawns</strong>)
        </span>
        <span className="text-[10px] text-slate-400">
          Stockfish engine referee evaluates board position.
        </span>
      </div>
    </div>
  );
};
