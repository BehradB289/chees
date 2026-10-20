export interface BookMove {
  san: string;
  weight: number;
  openingName: string;
}

/**
 * Extracts the position key (board placement + active color + castling rights)
 * from a full FEN string so transpositions match cleanly regardless of move clock.
 */
export function getFenPositionKey(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 3).join(' ');
}

/**
 * Grandmaster Opening Book keyed by FEN prefix (piece placement + turn + castling).
 * Covers Ruy Lopez, Italian Game, Sicilian Defense, French, Caro-Kann,
 * Queen's Gambit, Slav, King's Indian, Nimzo-Indian, and English Opening.
 */
export const GRANDMASTER_OPENING_BOOK: Record<string, BookMove[]> = {
  // Starting position (White)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq': [
    { san: 'e4', weight: 45, openingName: "King's Pawn Opening" },
    { san: 'd4', weight: 40, openingName: "Queen's Pawn Opening" },
    { san: 'c4', weight: 10, openingName: 'English Opening' },
    { san: 'Nf3', weight: 5, openingName: 'Réti Opening' },
  ],

  // Responses to 1. e4 (Black)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': [
    { san: 'c5', weight: 50, openingName: 'Sicilian Defense' },
    { san: 'e5', weight: 30, openingName: 'Open Game' },
    { san: 'e6', weight: 10, openingName: 'French Defense' },
    { san: 'c6', weight: 10, openingName: 'Caro-Kann Defense' },
  ],

  // Sicilian Defense: 1. e4 c5 (White)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': [
    { san: 'Nf3', weight: 80, openingName: 'Sicilian Defense · Open' },
    { san: 'Nc3', weight: 12, openingName: 'Sicilian Defense · Closed' },
    { san: 'c3', weight: 8, openingName: 'Sicilian Defense · Alapin Variation' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 (Black)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': [
    { san: 'd6', weight: 45, openingName: 'Sicilian Defense · Modern Line' },
    { san: 'Nc6', weight: 35, openingName: 'Sicilian Defense · Old Sicilian' },
    { san: 'e6', weight: 20, openingName: 'Sicilian Defense · Paulsen/Kan' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 d6 (White)
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': [
    { san: 'd4', weight: 90, openingName: 'Sicilian Defense · Open Variation' },
    { san: 'Bb5+', weight: 10, openingName: 'Sicilian Defense · Moscow Variation' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 d6 3. d4 (Black)
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq': [
    { san: 'cxd4', weight: 100, openingName: 'Sicilian Defense · Open Exchange' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 d6 3. d4 cxd4 (White)
  'rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq': [
    { san: 'Nxd4', weight: 100, openingName: 'Sicilian Defense · Open Main Line' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 (Black)
  'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq': [
    { san: 'Nf6', weight: 100, openingName: 'Sicilian Defense · Main Line' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 (White)
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq': [
    { san: 'Nc3', weight: 100, openingName: 'Sicilian Defense · Classical/Najdorf' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 (Black)
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq': [
    { san: 'a6', weight: 65, openingName: 'Sicilian Defense · Najdorf Variation' },
    { san: 'g6', weight: 20, openingName: 'Sicilian Defense · Dragon Variation' },
    { san: 'Nc6', weight: 15, openingName: 'Sicilian Defense · Classical Variation' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 Nc6 (White)
  'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': [
    { san: 'd4', weight: 80, openingName: 'Sicilian Defense · Open Nc6' },
    { san: 'Bb5', weight: 20, openingName: 'Sicilian Defense · Rossolimo Attack' },
  ],

  // Sicilian: 1. e4 c5 2. Nf3 Nc6 3. d4 (Black)
  'r1bqkbnr/pp1ppppp/2n5/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq': [
    { san: 'cxd4', weight: 100, openingName: 'Sicilian Defense · Open Sveshnikov/Accelerated' },
  ],

  // Open Game: 1. e4 e5 (White)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': [
    { san: 'Nf3', weight: 90, openingName: "King's Knight Opening" },
    { san: 'Bc4', weight: 10, openingName: "Bishop's Opening" },
  ],

  // Open Game: 1. e4 e5 2. Nf3 (Black)
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq': [
    { san: 'Nc6', weight: 85, openingName: "King's Knight · Nc6" },
    { san: 'Nf6', weight: 15, openingName: 'Petrov Defense' },
  ],

  // 1. e4 e5 2. Nf3 Nc6 (White)
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': [
    { san: 'Bb5', weight: 55, openingName: 'Ruy Lopez (Spanish Game)' },
    { san: 'Bc4', weight: 35, openingName: 'Italian Game' },
    { san: 'd4', weight: 10, openingName: 'Scotch Game' },
  ],

  // Ruy Lopez: 1. e4 e5 2. Nf3 Nc6 3. Bb5 (Black)
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq': [
    { san: 'a6', weight: 65, openingName: 'Ruy Lopez · Morphy Defense' },
    { san: 'Nf6', weight: 35, openingName: 'Ruy Lopez · Berlin Defense' },
  ],

  // Ruy Lopez Morphy: 3... a6 (White)
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq': [
    { san: 'Ba4', weight: 85, openingName: 'Ruy Lopez · Columbus Variation' },
    { san: 'Bxc6', weight: 15, openingName: 'Ruy Lopez · Exchange Variation' },
  ],

  // Ruy Lopez: 4. Ba4 (Black)
  'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq': [
    { san: 'Nf6', weight: 100, openingName: 'Ruy Lopez · Main Line' },
  ],

  // Ruy Lopez: 4. Ba4 Nf6 (White)
  'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq': [
    { san: 'O-O', weight: 100, openingName: 'Ruy Lopez · Closed Defense' },
  ],

  // Italian Game: 1. e4 e5 2. Nf3 Nc6 3. Bc4 (Black)
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq': [
    { san: 'Bc5', weight: 60, openingName: 'Italian Game · Giuoco Piano' },
    { san: 'Nf6', weight: 40, openingName: 'Italian Game · Two Knights Defense' },
  ],

  // Italian Game: 3... Bc5 (White)
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq': [
    { san: 'c3', weight: 60, openingName: 'Italian Game · Giuoco Piano Main Line' },
    { san: 'd3', weight: 40, openingName: 'Italian Game · Giuoco Pianissimo' },
  ],

  // French Defense: 1. e4 e6 (White)
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': [
    { san: 'd4', weight: 100, openingName: 'French Defense · Main Line' },
  ],

  // French Defense: 1. e4 e6 2. d4 (Black)
  'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq': [
    { san: 'd5', weight: 100, openingName: 'French Defense · d5 Challenge' },
  ],

  // Caro-Kann: 1. e4 c6 (White)
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': [
    { san: 'd4', weight: 100, openingName: 'Caro-Kann Defense · Main Line' },
  ],

  // Caro-Kann: 1. e4 c6 2. d4 (Black)
  'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq': [
    { san: 'd5', weight: 100, openingName: 'Caro-Kann Defense · Classical' },
  ],

  // Responses to 1. d4 (Black)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq': [
    { san: 'Nf6', weight: 55, openingName: 'Indian Defense' },
    { san: 'd5', weight: 45, openingName: "Queen's Pawn Game" },
  ],

  // Queen's Gambit: 1. d4 d5 (White)
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': [
    { san: 'c4', weight: 85, openingName: "Queen's Gambit" },
    { san: 'Bf4', weight: 15, openingName: 'London System' },
  ],

  // Queen's Gambit: 1. d4 d5 2. c4 (Black)
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq': [
    { san: 'e6', weight: 55, openingName: "Queen's Gambit Declined" },
    { san: 'c6', weight: 35, openingName: 'Slav Defense' },
    { san: 'dxc4', weight: 10, openingName: "Queen's Gambit Accepted" },
  ],

  // QGD: 1. d4 d5 2. c4 e6 (White)
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': [
    { san: 'Nc3', weight: 70, openingName: "Queen's Gambit Declined · Main Line" },
    { san: 'Nf3', weight: 30, openingName: "Queen's Gambit Declined · Knights" },
  ],

  // QGD: 1. d4 d5 2. c4 e6 3. Nc3 (Black)
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq': [
    { san: 'Nf6', weight: 80, openingName: "Queen's Gambit Declined · Orthodox" },
    { san: 'Be7', weight: 20, openingName: "Queen's Gambit Declined · Alatortsev" },
  ],

  // Indian Defense: 1. d4 Nf6 (White)
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': [
    { san: 'c4', weight: 85, openingName: 'Indian Game · c4' },
    { san: 'Bf4', weight: 15, openingName: 'London System' },
  ],

  // Indian Defense: 1. d4 Nf6 2. c4 (Black)
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq': [
    { san: 'e6', weight: 55, openingName: 'East Indian Defense' },
    { san: 'g6', weight: 45, openingName: "King's Indian Defense" },
  ],

  // Nimzo/Queen's Indian: 1. d4 Nf6 2. c4 e6 (White)
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': [
    { san: 'Nc3', weight: 65, openingName: 'Nimzo-Indian Setup' },
    { san: 'Nf3', weight: 35, openingName: "Queen's Indian Setup" },
  ],

  // Nimzo-Indian: 1. d4 Nf6 2. c4 e6 3. Nc3 (Black)
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq': [
    { san: 'Bb4', weight: 70, openingName: 'Nimzo-Indian Defense' },
    { san: 'd5', weight: 30, openingName: "Queen's Gambit Declined" },
  ],

  // King's Indian: 1. d4 Nf6 2. c4 g6 (White)
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq': [
    { san: 'Nc3', weight: 85, openingName: "King's Indian Defense · Nc3" },
    { san: 'Nf3', weight: 15, openingName: "King's Indian Defense · Fianchetto" },
  ],

  // King's Indian: 1. d4 Nf6 2. c4 g6 3. Nc3 (Black)
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq': [
    { san: 'Bg7', weight: 85, openingName: "King's Indian Defense · Main Line" },
    { san: 'd5', weight: 15, openingName: 'Grünfeld Defense' },
  ],

  // English Opening: 1. c4 (Black)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq': [
    { san: 'e5', weight: 50, openingName: 'English Opening · Reversed Sicilian' },
    { san: 'Nf6', weight: 30, openingName: 'English Opening · Anglo-Indian' },
    { san: 'c5', weight: 20, openingName: 'English Opening · Symmetrical' },
  ],
};

/**
 * Selects a book move for the given FEN.
 * In 'god' mode, prefers the highest-weight master main lines deterministically
 * (or top-tier master candidates).
 */
export function lookupOpeningBookMove(
  fen: string,
  topLineOnly = true
): BookMove | null {
  const key = getFenPositionKey(fen);
  const candidates = GRANDMASTER_OPENING_BOOK[key];
  if (!candidates || candidates.length === 0) return null;

  if (topLineOnly) {
    // Sort descending by weight and pick the top Grandmaster main line
    const sorted = [...candidates].sort((a, b) => b.weight - a.weight);
    return sorted[0];
  }

  const totalWeight = candidates.reduce((acc, c) => acc + c.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll <= 0) return candidate;
  }
  return candidates[0];
}

/**
 * Identifies the chess opening name from a sequence of SAN moves.
 */
export function detectOpeningName(historySan: string[]): string {
  if (historySan.length === 0) return 'Standard Starting Position';
  const line = historySan.join(' ');

  if (line.startsWith('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6')) return 'Sicilian Defense · Najdorf Variation';
  if (line.startsWith('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6')) return 'Sicilian Defense · Dragon Variation';
  if (line.startsWith('e4 c5 Nf3 d6 d4')) return 'Sicilian Defense · Open Line';
  if (line.startsWith('e4 c5 c3')) return 'Sicilian Defense · Alapin Variation';
  if (line.startsWith('e4 c5 Nc3')) return 'Sicilian Defense · Closed Variation';
  if (line.startsWith('e4 c5')) return 'Sicilian Defense';

  if (line.startsWith('e4 e5 Nf3 Nc6 Bb5 a6')) return 'Ruy Lopez · Morphy Defense';
  if (line.startsWith('e4 e5 Nf3 Nc6 Bb5 Nf6')) return 'Ruy Lopez · Berlin Defense';
  if (line.startsWith('e4 e5 Nf3 Nc6 Bb5')) return 'Ruy Lopez (Spanish Game)';

  if (line.startsWith('e4 e5 Nf3 Nc6 Bc4 Bc5')) return 'Italian Game · Giuoco Piano';
  if (line.startsWith('e4 e5 Nf3 Nc6 Bc4 Nf6')) return 'Italian Game · Two Knights Defense';
  if (line.startsWith('e4 e5 Nf3 Nc6 Bc4')) return 'Italian Game';
  if (line.startsWith('e4 e5 Nf3 Nc6 d4')) return 'Scotch Game';
  if (line.startsWith('e4 e5 Nf3 Nf6')) return 'Petrov Defense';
  if (line.startsWith('e4 e5')) return "King's Pawn Open Game";

  if (line.startsWith('e4 e6')) return 'French Defense';
  if (line.startsWith('e4 c6')) return 'Caro-Kann Defense';
  if (line.startsWith('e4 d5')) return 'Scandinavian Defense';

  if (line.startsWith('d4 d5 c4 e6')) return "Queen's Gambit Declined";
  if (line.startsWith('d4 d5 c4 c6')) return 'Slav Defense';
  if (line.startsWith('d4 d5 c4 dxc4')) return "Queen's Gambit Accepted";
  if (line.startsWith('d4 d5 c4')) return "Queen's Gambit";
  if (line.startsWith('d4 d5 Bf4') || line.startsWith('d4 Nf6 Bf4')) return 'London System';

  if (line.startsWith('d4 Nf6 c4 e6 Nc3 Bb4')) return 'Nimzo-Indian Defense';
  if (line.startsWith('d4 Nf6 c4 g6 Nc3 d5')) return 'Grünfeld Defense';
  if (line.startsWith('d4 Nf6 c4 g6')) return "King's Indian Defense";
  if (line.startsWith('d4 Nf6')) return 'Indian Defense';

  if (line.startsWith('c4')) return 'English Opening';
  if (line.startsWith('Nf3')) return 'Réti Opening';
  if (line.startsWith('e4')) return "King's Pawn Opening";
  if (line.startsWith('d4')) return "Queen's Pawn Opening";

  return 'Custom Tactical Line';
}
