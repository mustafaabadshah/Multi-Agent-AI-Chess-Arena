import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StatusBadge } from '../components/StatusBadge';
import { EvaluationBar } from '../components/EvaluationBar';
import { AgentCard } from '../components/AgentCard';
import { MoveHistory } from '../components/MoveHistory';
import { MoveDetails } from '../components/MoveDetails';
import { GameControls } from '../components/GameControls';
import { CriticalMoments } from '../components/CriticalMoments';
import { MoveRecord, CriticalMomentItem } from '../types';

describe('ChessMind Arena Frontend Component Suite', () => {
  it('renders StatusBadge correctly for various states', () => {
    const { rerender } = render(<StatusBadge status="running" />);
    expect(screen.getByText(/running/i)).toBeInTheDocument();

    rerender(<StatusBadge status="completed" />);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();

    rerender(<StatusBadge status="running" isCheckmate={true} />);
    expect(screen.getByText(/checkmate/i)).toBeInTheDocument();
  });

  it('renders EvaluationBar with accurate numeric label', () => {
    render(<EvaluationBar score={0.42} depth={15} />);
    expect(screen.getByText('+0.42')).toBeInTheDocument();
    expect(screen.getByText('d15')).toBeInTheDocument();
  });

  it('renders AgentCard with model name and personality style', () => {
    render(
      <AgentCard
        color="white"
        model="qwen/qwen3.8-27b"
        personality="Strategic Aggressor"
        isThinking={false}
        confidence={0.92}
      />
    );
    expect(screen.getByText(/white agent/i)).toBeInTheDocument();
    expect(screen.getByText('Strategic Aggressor')).toBeInTheDocument();
    expect(screen.getByText('qwen/qwen3.8-27b')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('displays same-model warning on AgentCard when models match', () => {
    render(
      <AgentCard
        color="white"
        model="qwen/qwen3.8-27b"
        personality="Strategic Aggressor"
        warningSameModel={true}
      />
    );
    expect(
      screen.getByText(/both agents are using the same model/i)
    ).toBeInTheDocument();
  });

  it('renders MoveHistory and handles move selection', () => {
    const mockMoves: MoveRecord[] = [
      {
        id: '1',
        game_id: 'g1',
        ply: 1,
        move_number: 1,
        color: 'white',
        agent: 'white_agent',
        model: 'model-a',
        personality: 'Aggressor',
        fen_before: 'start',
        uci_move: 'e2e4',
        san_move: 'e4',
        fen_after: 'after',
        move_quality: 'Best Move',
        alternatives: [],
        secondary_strategies: [],
        move_source: 'llm',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        game_id: 'g1',
        ply: 2,
        move_number: 1,
        color: 'black',
        agent: 'black_agent',
        model: 'model-b',
        personality: 'Defender',
        fen_before: 'after',
        uci_move: 'e7e5',
        san_move: 'e5',
        fen_after: 'after2',
        move_quality: 'Good',
        alternatives: [],
        secondary_strategies: [],
        move_source: 'llm',
        created_at: new Date().toISOString(),
      },
    ];

    const onSelect = vi.fn();
    render(<MoveHistory moves={mockMoves} onSelectMove={onSelect} />);

    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
    expect(screen.getByText('Best Move')).toBeInTheDocument();

    fireEvent.click(screen.getByText('e4'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('renders MoveDetails with structured decision factors and alternatives', () => {
    const sampleMove: MoveRecord = {
      id: 'm1',
      game_id: 'g1',
      ply: 1,
      move_number: 1,
      color: 'white',
      agent: 'white_agent',
      model: 'qwen/qwen3.8-27b',
      personality: 'Strategic Aggressor',
      fen_before: 'start',
      uci_move: 'e2e4',
      san_move: 'e4',
      fen_after: 'fen',
      decision_summary: 'Controls the central squares and opens bishop lines.',
      confidence: 0.95,
      strategy: 'Center Control',
      secondary_strategies: ['Opening Development'],
      risk_level: 'low',
      alternatives: [{ move: 'd4', reason: 'Direct pawn push' }],
      stockfish_eval_before: 0.2,
      stockfish_eval_after: 0.35,
      stockfish_best_move: 'e4',
      centipawn_loss: 0,
      move_quality: 'Best Move',
      latency_ms: 850,
      move_source: 'llm',
      created_at: new Date().toISOString(),
    };

    render(<MoveDetails move={sampleMove} />);

    expect(screen.getByText(/Decision Inspector/i)).toBeInTheDocument();
    expect(screen.getByText('Center Control')).toBeInTheDocument();
    expect(screen.getByText(/Controls the central squares/i)).toBeInTheDocument();
    expect(screen.getByText('d4')).toBeInTheDocument();
    expect(screen.getByText('Direct pawn push')).toBeInTheDocument();
  });

  it('renders GameControls and responds to start, pause, step, and stop actions', () => {
    const onStart = vi.fn();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onNextMove = vi.fn();
    const onStop = vi.fn();
    const onFlip = vi.fn();
    const onChangeDelay = vi.fn();

    const { rerender } = render(
      <GameControls
        status="waiting"
        onStart={onStart}
        onPause={onPause}
        onResume={onResume}
        onNextMove={onNextMove}
        onStop={onStop}
        onFlipBoard={onFlip}
        moveDelayMs={1000}
        onChangeDelay={onChangeDelay}
      />
    );

    const startBtn = screen.getByText(/start game/i);
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalled();

    rerender(
      <GameControls
        status="running"
        onStart={onStart}
        onPause={onPause}
        onResume={onResume}
        onNextMove={onNextMove}
        onStop={onStop}
        onFlipBoard={onFlip}
        moveDelayMs={1000}
        onChangeDelay={onChangeDelay}
      />
    );

    const pauseBtn = screen.getByText(/pause/i);
    fireEvent.click(pauseBtn);
    expect(onPause).toHaveBeenCalled();
  });

  it('renders CriticalMoments and triggers ply jump on selection', () => {
    const mockMoments: CriticalMomentItem[] = [
      {
        ply: 15,
        move_number: 8,
        color: 'white',
        san_move: 'Nxf7',
        eval_before: 0.4,
        eval_after: 2.8,
        eval_swing: 2.4,
        quality: 'Best Move',
        description: 'Tactical sacrifice turning the match in favor of White.',
        stockfish_best_move: 'Nxf7',
      },
    ];

    const onSelectPly = vi.fn();
    render(<CriticalMoments moments={mockMoments} onSelectPly={onSelectPly} />);

    expect(screen.getByText(/Critical Turning Points/i)).toBeInTheDocument();
    expect(screen.getByText(/Tactical sacrifice/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Tactical sacrifice/i));
    expect(onSelectPly).toHaveBeenCalledWith(15);
  });
});
