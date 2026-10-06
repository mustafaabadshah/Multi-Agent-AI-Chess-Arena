import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { Navbar } from './components/Navbar';
import { NewGameModal } from './components/NewGameModal';
import { ArenaPage } from './pages/ArenaPage';
import { GameHistoryPage } from './pages/GameHistoryPage';
import { GameReplayPage } from './pages/GameReplayPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import { ResearchPage } from './pages/ResearchPage';
import { TournamentPage } from './pages/TournamentPage';

import { api } from './services/api';
import { GroqModelInfo, AgentPersonality } from './types';

export function App() {
  const [isNewGameOpen, setIsNewGameOpen] = useState<boolean>(false);
  const [models, setModels] = useState<GroqModelInfo[]>([]);
  const [personalities, setPersonalities] = useState<AgentPersonality[]>([]);

  useEffect(() => {
    Promise.all([api.getModels(), api.getPersonalities()])
      .then(([mList, pList]) => {
        setModels(mList);
        setPersonalities(pList);
      })
      .catch((err) => console.error('Failed to load initial metadata:', err));
  }, []);

  const handleCreateGame = async (params: any) => {
    try {
      const newGame = await api.createGame(params);
      if (params.auto_start) {
        await api.startGame(newGame.id);
      }
      // Reload page or navigate to arena with new game
      window.location.href = `/arena?gameId=${newGame.id}`;
    } catch (err: any) {
      alert(`Error creating game: ${err.message}`);
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-arena-950 text-slate-100 flex flex-col font-sans">
        <Navbar onOpenNewGame={() => setIsNewGameOpen(true)} />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/arena" replace />} />
            <Route path="/arena" element={<ArenaPage onOpenNewGame={() => setIsNewGameOpen(true)} />} />
            <Route path="/tournament" element={<TournamentPage />} />
            <Route path="/games" element={<GameHistoryPage />} />
            <Route path="/games/:id" element={<GameReplayPage />} />
            <Route path="/games/:id/analysis" element={<AnalysisPage />} />
            <Route path="/models" element={<ModelComparisonPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="*" element={<Navigate to="/arena" replace />} />
          </Routes>
        </main>

        <NewGameModal
          isOpen={isNewGameOpen}
          onClose={() => setIsNewGameOpen(false)}
          onSubmit={handleCreateGame}
          models={models}
          personalities={personalities}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
