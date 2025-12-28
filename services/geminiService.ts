
import { GoogleGenAI, Type } from "@google/genai";
import { Flashcard } from "../types";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a function with exponential backoff retries.
 * Useful for handling transient network issues or 429 Rate Limits.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Extract error message from various possible formats
      const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
      const isRateLimit = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || error?.status === 429;
      
      // If we've hit a rate limit, wait longer before retrying
      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 3000; // 3s, 6s...
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
}

export async function parsePgnToFlashcards(pgn: string): Promise<Flashcard[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing API Key. Ensure process.env.API_KEY is available.");
  }

  // Use Flash model for significantly higher quota limits and faster processing
  const ai = new GoogleGenAI({ apiKey });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        SYSTEM: You are a Chess Data Verification Expert.
        TASK: Extract educational flashcards from the provided PGN.
        
        VERIFICATION PROTOCOL:
        1. IDENTIFY: Locate every annotator comment inside braces {}.
        2. SIMULATE: Verify the FEN string after the current move is EXACTLY correct.
        3. CROSS-REFERENCE: Map variations in parentheses () to the move the comment belongs to.
        4. ATTRIBUTION: Ensure 'player_to_move' is the side that just moved.
        
        DATA SCHEMA:
        - card_id: incrementing integer.
        - comment_text: The string inside {}.
        - position_fen: The board state AFTER the annotated move.
        - variations_text: The alternate moves in (). If none, "".
        - main_line_move: The actual move played in the PGN.
        - move_number: The move number.
        - player_to_move: "White" or "Black".

        INPUT PGN:
        ${pgn}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              card_id: { type: Type.INTEGER },
              front_content: {
                type: Type.OBJECT,
                properties: {
                  comment_text: { type: Type.STRING }
                },
                required: ["comment_text"]
              },
              back_content: {
                type: Type.OBJECT,
                properties: {
                  position_fen: { type: Type.STRING },
                  main_line_move: { type: Type.STRING },
                  variations_text: { type: Type.STRING },
                  move_number: { type: Type.INTEGER },
                  player_to_move: { type: Type.STRING }
                },
                required: ["position_fen", "main_line_move", "variations_text", "move_number", "player_to_move"]
              }
            },
            required: ["card_id", "front_content", "back_content"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI engine.");

    try {
      return JSON.parse(text.trim());
    } catch (error) {
      console.error("JSON Parsing failed. Raw response:", text);
      throw new Error("Failed to interpret the AI response as valid JSON.");
    }
  });
}
