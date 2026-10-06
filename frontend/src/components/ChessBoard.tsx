import React, { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow } from 'react-chessboard';

interface ChessBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  lastMoveUci?: string;
  bestMoveUci?: string;
  boardWidth?: number;
  onPieceDrop?: (sourceSquare: string, targetSquare: string) => boolean;
  arePiecesDraggable?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation = 'white',
  lastMoveUci,
  bestMoveUci,
  boardWidth = 500,
  onPieceDrop,
  arePiecesDraggable = false,
}) => {
  // Highlight squares for last move
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMoveUci && lastMoveUci.length >= 4) {
      const fromSq = lastMoveUci.slice(0, 2);
      const toSq = lastMoveUci.slice(2, 4);
      styles[fromSq] = {
        backgroundColor: 'rgba(6, 182, 212, 0.35)',
      };
      styles[toSq] = {
        backgroundColor: 'rgba(6, 182, 212, 0.5)',
      };
    }
    return styles;
  }, [lastMoveUci]);

  // Generate arrow for best engine move
  const arrows = useMemo(() => {
    const arrowList: Arrow[] = [];
    if (bestMoveUci && bestMoveUci.length >= 4) {
      const fromSq = bestMoveUci.slice(0, 2);
      const toSq = bestMoveUci.slice(2, 4);
      arrowList.push({
        startSquare: fromSq,
        endSquare: toSq,
        color: 'rgb(16, 185, 129)', // emerald arrow
      });
    }
    return arrowList;
  }, [bestMoveUci]);

  return (
    <div className="relative flex justify-center items-center select-none">
      <div 
        className="rounded-xl overflow-hidden shadow-2xl border-2 border-arena-border bg-arena-950 p-2"
        style={{ width: boardWidth + 16, height: boardWidth + 16 }}
      >
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            boardStyle: { width: `${boardWidth}px`, height: `${boardWidth}px` },
            darkSquareStyle: { backgroundColor: '#182235' },
            lightSquareStyle: { backgroundColor: '#cbd5e1' },
            squareStyles: squareStyles,
            arrows: arrows,
            animationDurationInMs: 250,
            allowDragging: arePiecesDraggable,
            onPieceDrop: onPieceDrop
              ? ({ sourceSquare, targetSquare }) => onPieceDrop(sourceSquare, targetSquare || '')
              : undefined,
          }}
        />
      </div>
    </div>
  );
};
