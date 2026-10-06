import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Swords, Plus, Activity, History, BarChart3, FlaskConical, Trophy } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  onOpenNewGame: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNewGame }) => {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  useEffect(() => {
    api.getHealth()
      .then((h) => setIsHealthy(h.status === 'healthy'))
      .catch(() => setIsHealthy(false));
  }, []);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
      isActive
        ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-arena-800/60'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-arena-950/90 backdrop-blur-md border-b border-arena-border px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <NavLink to="/arena" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-950 group-hover:scale-105 transition-transform">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-slate-100 font-mono">
                  CHESSMIND<span className="text-cyan-400">ARENA</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/70 text-purple-300 border border-purple-800/50">
                  AI LAB
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                Multi-Agent Reasoning & Strategy Platform
              </p>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/arena" className={navClass}>
              <Activity className="w-3.5 h-3.5" />
              Arena
            </NavLink>
            <NavLink to="/tournament" className={navClass}>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Tournament
            </NavLink>
            <NavLink to="/games" className={navClass}>
              <History className="w-3.5 h-3.5" />
              Game History
            </NavLink>
            <NavLink to="/models" className={navClass}>
              <BarChart3 className="w-3.5 h-3.5" />
              Models
            </NavLink>
            <NavLink to="/research" className={navClass}>
              <FlaskConical className="w-3.5 h-3.5" />
              Research Mode
            </NavLink>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Health indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-arena-900 border border-arena-border text-[11px] font-mono text-slate-400"
            title={isHealthy ? 'Backend API connected' : 'Backend API degraded or unreachable'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 animate-ping'
              }`}
            />
            <span className="hidden sm:inline">{isHealthy ? 'Live API' : 'Disconnected'}</span>
          </div>

          {/* New Game Button */}
          <button
            type="button"
            onClick={onOpenNewGame}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950/50 transition-all hover:scale-102"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>
    </header>
  );
};
