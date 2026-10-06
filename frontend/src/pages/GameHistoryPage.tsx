import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BarChart2, Trash2, Download, Search, Filter } from 'lucide-react';
import { Game } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export const GameHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadGames();
  }, [statusFilter]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const data = await api.listGames({
        status: statusFilter || undefined,
        limit: 50,
      });
      setGames(data.games);
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to load games:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this game record?')) {
      await api.deleteGame(id);
      loadGames();
    }
  };

  const filteredGames = games.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.white_model.toLowerCase().includes(q) ||
      g.black_model.toLowerCase().includes(q) ||
      g.white_personality.toLowerCase().includes(q) ||
      g.black_personality.toLowerCase().includes(q) ||
      (g.opening && g.opening.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Page Title & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Match Archives & History</h1>
          <p className="text-xs text-slate-400">
            Recorded AI vs AI matches with complete move telemetry and Stockfish evaluation.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search model or opening..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-arena-panel border border-arena-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono w-56"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-arena-panel border border-arena-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="aborted">Aborted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-arena-panel border border-arena-border rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-arena-900 border-b border-arena-border text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Game / Date</th>
                <th className="py-3 px-4">White Agent</th>
                <th className="py-3 px-4">Black Agent</th>
                <th className="py-3 px-4">Opening</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Plies</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/50 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    Loading matches...
                  </td>
                </tr>
              ) : filteredGames.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No matching games recorded.
                  </td>
                </tr>
              ) : (
                filteredGames.map((game) => (
                  <tr key={game.id} className="hover:bg-arena-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="font-semibold text-slate-200">{game.id.slice(0, 8)}...</div>
                      <div className="text-slate-500">
                        {new Date(game.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{game.white_personality}</div>
                      <div className="font-mono text-[10px] text-cyan-400">{game.white_model}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{game.black_personality}</div>
                      <div className="font-mono text-[10px] text-purple-400">{game.black_model}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {game.opening || 'Open Game'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={game.status} />
                        {game.winner && (
                          <span className="font-mono font-bold text-xs text-slate-100">
                            {game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {game.current_ply} plies ({game.move_number} moves)
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/games/${game.id}`)}
                          className="p-1.5 rounded hover:bg-arena-800 text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="Replay Game"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/games/${game.id}/analysis`)}
                          className="p-1.5 rounded hover:bg-arena-800 text-purple-400 hover:text-purple-300 transition-colors"
                          title="View Analysis"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={api.getPgnUrl(game.id)}
                          download
                          className="p-1.5 rounded hover:bg-arena-800 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Download PGN"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDelete(game.id)}
                          className="p-1.5 rounded hover:bg-arena-800 text-rose-500 hover:text-rose-400 transition-colors"
                          title="Delete Game"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
