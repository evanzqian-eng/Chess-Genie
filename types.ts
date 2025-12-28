
export interface Flashcard {
  card_id: number;
  front_content: {
    comment_text: string;
  };
  back_content: {
    position_fen: string;
    main_line_move: string;
    variations_text: string | null;
    move_number: number;
    player_to_move: string;
  };
}

export interface ParsingResponse {
  flashcards: Flashcard[];
}
