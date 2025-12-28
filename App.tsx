
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parsePgnToFlashcards } from './services/geminiService';
import { Flashcard } from './types';
import { SAMPLE_PGN, PIECE_SYMBOLS } from './constants';
import { ChessBoard } from './components/ChessBoard';
import { PrintView } from './components/PrintView';
import { jsPDF } from 'jspdf';
import { 
  Layout, 
  Loader2, 
  Trash2, 
  Sparkles, 
  FileText, 
  Upload,
  FileDown,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X
} from 'lucide-react';

const App: React.FC = () => {
  const [pgn, setPgn] = useState(SAMPLE_PGN);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success'>('idle');
  const [batchCount, setBatchCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (pdfStatus === 'success') {
      const timer = setTimeout(() => setPdfStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [pdfStatus]);

  const renderFenToDataUrl = useCallback((fen: string): string => {
    if (boardCache.current.has(fen)) return boardCache.current.get(fen)!;

    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    const boardSize = 600;
    canvas.width = boardSize;
    canvas.height = boardSize;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return '';

    const rows = fen.split(' ')[0].split('/');
    const cellSize = boardSize / 8;

    ctx.fillStyle = '#F0D9B5';
    ctx.fillRect(0, 0, boardSize, boardSize);

    rows.forEach((row, rIdx) => {
      let cIdx = 0;
      for (const char of row) {
        if (!isNaN(parseInt(char))) {
          const emptyCount = parseInt(char);
          for (let i = 0; i < emptyCount; i++) {
            if ((rIdx + cIdx) % 2 === 1) {
              ctx.fillStyle = '#B58863';
              ctx.fillRect(cIdx * cellSize, rIdx * cellSize, cellSize, cellSize);
            }
            cIdx++;
          }
        } else {
          if ((rIdx + cIdx) % 2 === 1) {
            ctx.fillStyle = '#B58863';
            ctx.fillRect(cIdx * cellSize, rIdx * cellSize, cellSize, cellSize);
          }
          const isWhite = char === char.toUpperCase();
          ctx.fillStyle = isWhite ? '#FFFFFF' : '#000000';
          ctx.font = `${cellSize * 0.8}px "serif"`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const symbol = PIECE_SYMBOLS[char] || char;
          ctx.fillText(symbol, cIdx * cellSize + cellSize / 2, rIdx * cellSize + cellSize / 2);
          cIdx++;
        }
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    boardCache.current.set(fen, dataUrl);
    return dataUrl;
  }, []);

  const handleParse = async () => {
    if (!pgn.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await parsePgnToFlashcards(pgn);
      if (results && results.length > 0) {
        setFlashcards(results);
        setBatchCount(prev => prev + 1);
        results.forEach(card => renderFenToDataUrl(card.back_content.position_fen));
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      let errorStr = "";
      try {
        errorStr = typeof err === 'string' ? err : JSON.stringify(err);
      } catch (e) {
        errorStr = err?.message || "Unknown error";
      }

      if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota")) {
        setError("API Quota Exceeded. The Gemini Flash engine is currently busy. Please wait 10 seconds and try again.");
      } else {
        setError("Extraction failed. Please ensure your PGN is valid and contains move annotations in {braces}.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPgn(event.target?.result as string || '');
    reader.readAsText(file);
  };

  const handlePrint = async () => {
    if (flashcards.length === 0) return;
    setPdfStatus('generating');
    await new Promise(r => setTimeout(r, 100));

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      
      const sideMargin = 35; // Reduced margin for bigger card width
      const cardHeight = 65; // Increased height
      const topMargin = 15; 
      const gap = 10.58; // 40px gap in mm
      const cardBorderRadius = 10;

      const chunks: Flashcard[][] = [];
      for (let i = 0; i < flashcards.length; i += 3) {
        chunks.push(flashcards.slice(i, i + 3));
      }

      chunks.forEach((chunk, chunkIdx) => {
        if (chunkIdx > 0) doc.addPage();
        
        // FRONT SIDE
        chunk.forEach((card, idx) => {
          const yStart = topMargin + idx * (cardHeight + gap);
          doc.setDrawColor(20); 
          doc.setLineWidth(1.8); 
          doc.roundedRect(sideMargin, yStart, pageWidth - (sideMargin * 2), cardHeight, cardBorderRadius, cardBorderRadius, 'D');
          
          doc.setTextColor(150);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("PROMPT:", sideMargin + 10, yStart + 12);

          doc.setTextColor(30);
          doc.setFont("times", "italic");
          doc.setFontSize(16); 
          const textAreaWidth = (pageWidth - (sideMargin * 2)) - 65;
          const lines = doc.splitTextToSize(`"${card.front_content.comment_text}"`, textAreaWidth);
          doc.text(lines, sideMargin + 10, yStart + 22);

          doc.setTextColor(150);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text(`Move ${card.back_content.move_number} | ${card.back_content.player_to_move}`, sideMargin + 10, yStart + cardHeight - 10);
          
          const boardDataUrl = renderFenToDataUrl(card.back_content.position_fen);
          const boardImgSize = 48; // Bigger board
          doc.addImage(boardDataUrl, 'PNG', pageWidth - boardImgSize - sideMargin - 8, yStart + (cardHeight - boardImgSize) / 2, boardImgSize, boardImgSize, undefined, 'FAST');
        });

        // BACK SIDE
        doc.addPage();
        chunk.forEach((card, idx) => {
          const yStart = topMargin + idx * (cardHeight + gap);
          doc.setDrawColor(20);
          doc.setLineWidth(1.8);
          doc.roundedRect(sideMargin, yStart, pageWidth - (sideMargin * 2), cardHeight, cardBorderRadius, cardBorderRadius, 'D');
          
          const textToShow = card.back_content.variations_text;
          if (textToShow && textToShow.trim().length > 0) {
            doc.setTextColor(150);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text("THE ANSWER:", pageWidth / 2, yStart + 15, { align: 'center' });

            doc.setTextColor(0);
            doc.setFont("times", "bolditalic");
            doc.setFontSize(26); // Bigger answer text
            const wrappedText = doc.splitTextToSize(textToShow, pageWidth - (sideMargin * 2) - 30);
            doc.text(wrappedText, pageWidth / 2, yStart + (cardHeight / 2) + 6, { align: 'center' });
          }
        });
      });

      doc.save(`Chess_Genie_Cards_${batchCount}.pdf`);
      setPdfStatus('success');
    } catch (err) {
      console.error(err);
      setPdfStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <div className="screen-only pb-20">
        <header className="bg-white/90 backdrop-blur-lg border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
              <Sparkles size={18} />
            </div>
            <h1 className="text-lg font-black italic text-slate-900 tracking-tighter">GENIE</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:border-indigo-400 transition-all flex items-center gap-2">
              <Upload size={14} /> PGN
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button onClick={() => {setPgn(''); setFlashcards([]); boardCache.current.clear(); setError(null);}} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-4">
            <div className="bg-white rounded-3xl shadow-xl border-[6px] border-slate-900 overflow-hidden sticky top-24">
              {error && (
                <div className="bg-red-50 border-b-[6px] border-slate-900 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-red-700 leading-snug">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
              <textarea
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                className="w-full h-[400px] p-6 text-[11px] font-mono border-0 focus:ring-0 resize-none bg-white"
                placeholder="Paste PGN here..."
              />
              <div className="p-4 bg-white border-t-[6px] border-slate-900">
                <button
                  onClick={handleParse}
                  disabled={loading || !pgn.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.97]"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={18} />}
                  <span className="uppercase tracking-widest text-xs">{loading ? "Analyzing..." : "Generate Cards"}</span>
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-8 space-y-8 min-h-[500px]">
            {flashcards.length > 0 && !loading && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-8">
                  {flashcards.map((card, idx) => (
                    <div key={card.card_id} className="bg-white rounded-[1.5rem] border-[6px] border-slate-900 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                      <div className="p-6 bg-slate-50/50 flex items-center gap-8">
                        <div className="shrink-0 p-2 bg-white rounded-2xl shadow-lg border-2 border-slate-100">
                          <ChessBoard fen={card.back_content.position_fen} size={140} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">The Question</span>
                          <p className="text-[20px] font-serif italic text-slate-900 leading-tight">"{card.front_content.comment_text}"</p>
                        </div>
                      </div>
                      <div className="p-6 bg-white border-t-2 border-slate-50">
                        {card.back_content.variations_text ? (
                          <>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 block">The Answer (Variation)</span>
                            <div className="text-2xl font-black italic text-slate-900">
                              {card.back_content.variations_text}
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] italic text-slate-300">No variation answer for this position.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 flex justify-center sticky bottom-8 z-30">
                  <button 
                    onClick={handlePrint} 
                    disabled={pdfStatus === 'generating'} 
                    className="min-w-[340px] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-10 rounded-3xl shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-[11px] flex items-center justify-center gap-3"
                  >
                    {pdfStatus === 'generating' ? <Loader2 className="animate-spin" size={18} /> : 
                     pdfStatus === 'success' ? <CheckCircle2 size={18} /> : <FileDown size={18} />}
                    {pdfStatus === 'generating' ? "Building PDF..." : 
                     pdfStatus === 'success' ? "Downloaded!" : "Download PDF"}
                  </button>
                </div>
              </div>
            )}
            {loading && (
              <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processing Chess Data...</span>
              </div>
            )}
            {!loading && flashcards.length === 0 && !error && (
              <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 space-y-4 border-4 border-dashed border-slate-200 rounded-3xl">
                <FileText size={48} strokeWidth={1} />
                <p className="text-[11px] font-black uppercase tracking-[0.2em]">Paste a PGN to begin extraction</p>
              </div>
            )}
          </section>
        </main>
      </div>
      <div className="print-only">
        {flashcards.length > 0 && <PrintView flashcards={flashcards} batchCount={batchCount} />}
      </div>
    </div>
  );
};

export default App;
