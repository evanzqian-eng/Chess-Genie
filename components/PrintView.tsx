
import React from 'react';
import { Flashcard } from '../types';
import { ChessBoard } from './ChessBoard';

interface PrintViewProps {
  flashcards: Flashcard[];
  batchCount: number;
}

export const PrintView: React.FC<PrintViewProps> = ({ flashcards, batchCount }) => {
  const chunks: Flashcard[][] = [];
  for (let i = 0; i < flashcards.length; i += 3) {
    chunks.push(flashcards.slice(i, i + 3));
  }

  // 40px is approx 10.6mm at 96 DPI
  const gapSize = "10.6mm";
  // Increased side margin to 35mm to match PDF logic (210 - 35*2 = 140mm width)
  const pxPadding = "35mm";

  return (
    <div className="bg-white">
      {chunks.map((chunk, chunkIdx) => (
        <React.Fragment key={chunkIdx}>
          {/* FRONT PAGE: The Prompt (Board + Comment) stacked at the top */}
          <div className="page-break flex flex-col h-[297mm] w-[210mm] mx-auto overflow-hidden bg-white pt-[15mm]">
            {chunk.map((card, idx) => (
              <div 
                key={`front-${card.card_id}`} 
                className="w-full flex flex-col items-center"
                style={{ 
                  paddingLeft: pxPadding, 
                  paddingRight: pxPadding,
                  marginBottom: idx < chunk.length - 1 ? gapSize : 0 
                }}
              >
                <div className="w-full h-[65mm] border-[6px] border-slate-900 rounded-[2.5rem] p-6 flex items-center justify-between gap-6 bg-white relative">
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[9px] uppercase font-black text-slate-400 mb-2 tracking-[0.4em]">Prompt:</div>
                    <div className="text-[16px] font-serif italic text-slate-900 leading-tight pr-4">
                      "{card.front_content.comment_text}"
                    </div>
                    <div className="absolute bottom-5 left-6 text-[8px] font-bold uppercase tracking-widest text-slate-300">
                      Move {card.back_content.move_number} | {card.back_content.player_to_move}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <div className="p-1.5 bg-white border-2 border-slate-100 rounded-xl shadow-sm">
                      <ChessBoard fen={card.back_content.position_fen} size={100} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BACK PAGE: The Answer (Variations Only) stacked at the top */}
          <div className="page-break flex flex-col h-[297mm] w-[210mm] mx-auto overflow-hidden bg-white pt-[15mm]">
            {chunk.map((card, idx) => (
              <div 
                key={`back-${card.card_id}`} 
                className="w-full flex flex-col items-center"
                style={{ 
                  paddingLeft: pxPadding, 
                  paddingRight: pxPadding,
                  marginBottom: idx < chunk.length - 1 ? gapSize : 0 
                }}
              >
                <div className="w-full h-[65mm] border-[6px] border-slate-900 rounded-[2.5rem] p-8 flex flex-col items-center justify-center bg-white text-center">
                    {card.back_content.variations_text && card.back_content.variations_text.trim().length > 0 ? (
                      <>
                        <div className="text-[9px] uppercase font-black text-slate-400 mb-6 tracking-[0.4em]">The Answer:</div>
                        <div className="text-[24px] font-black text-slate-900 leading-none italic tracking-tight">
                          {card.back_content.variations_text}
                        </div>
                      </>
                    ) : null}
                </div>
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
