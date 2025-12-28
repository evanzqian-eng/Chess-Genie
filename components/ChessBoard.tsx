
import React from 'react';
import { PIECE_SYMBOLS } from '../constants';

interface ChessBoardProps {
  fen: string;
  size?: number;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ fen, size = 150 }) => {
  const rows = fen.split(' ')[0].split('/');
  const board: (string | null)[][] = rows.map(row => {
    const rowArr: (string | null)[] = [];
    for (const char of row) {
      if (isNaN(parseInt(char))) {
        rowArr.push(char);
      } else {
        for (let i = 0; i < parseInt(char); i++) {
          rowArr.push(null);
        }
      }
    }
    return rowArr;
  });

  const cellSize = size / 8;

  return (
    <div 
      className="chess-board-locked-square" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        display: 'block',
        position: 'relative',
        backgroundColor: '#F0D9B5',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`} 
        preserveAspectRatio="xMidYMid meet"
        style={{ 
          display: 'block', 
          width: `${size}px`, 
          height: `${size}px`,
          shapeRendering: 'crispEdges'
        }}
      >
        {board.map((row, rIdx) => 
          row.map((piece, cIdx) => {
            const isDark = (rIdx + cIdx) % 2 === 1;
            const isWhitePiece = piece && piece === piece.toUpperCase();
            
            return (
              <React.Fragment key={`${rIdx}-${cIdx}`}>
                <rect
                  x={cIdx * cellSize}
                  y={rIdx * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={isDark ? '#B58863' : '#F0D9B5'}
                />
                {piece && (
                  <text
                    x={cIdx * cellSize + cellSize / 2}
                    y={rIdx * cellSize + cellSize / 2}
                    dominantBaseline="central"
                    textAnchor="middle"
                    fontSize={cellSize * 0.85}
                    fill={isWhitePiece ? '#FFFFFF' : '#000000'}
                    style={{ 
                      textShadow: isWhitePiece ? '1px 1px 2px rgba(0,0,0,0.6)' : 'none',
                      fontFamily: 'serif',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                  >
                    {PIECE_SYMBOLS[piece] || piece}
                  </text>
                )}
              </React.Fragment>
            );
          })
        )}
      </svg>
    </div>
  );
};
