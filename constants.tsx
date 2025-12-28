
import React from 'react';

// Using the solid ("Black") Unicode variants for both colors 
// so we can reliably control their shade with the 'fill' attribute.
// We append \uFE0E to force the browser to render them as text, not emojis.
export const PIECE_SYMBOLS: Record<string, string> = {
  p: '♟\uFE0E', r: '♜\uFE0E', n: '♞\uFE0E', b: '♝\uFE0E', q: '♛\uFE0E', k: '♚\uFE0E',
  P: '♟\uFE0E', R: '♜\uFE0E', N: '♞\uFE0E', B: '♝\uFE0E', Q: '♛\uFE0E', K: '♚\uFE0E'
};

export const SAMPLE_PGN = `[Event "Fictional Game"]

e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This is the Ruy Lopez exchange variation setup, though usually White takes on c6 here.} 4. Ba4 Nf6 5. O-O (5. Qe2 b5 6. Bb3 Be7) 5... Be7 {Black develops solidly.} 6. Re1 b5 7. Bb3 d6 8. c3 O-O {A very standard position. White plans d4.}`;
