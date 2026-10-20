import { Chess, type PieceSymbol, type Color } from 'chess.js';

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 950,
  k: 20000,
};

export const MATERIAL_DISPLAY_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Piece-Square Tables from White's perspective (index 0 = a8, index 63 = h1)
const PAWN_PST_MG = [
   0,   0,   0,   0,   0,   0,   0,   0,
  50,  50,  50,  50,  50,  50,  50,  50,
  15,  15,  25,  35,  35,  25,  15,  15,
   5,   5,  12,  28,  28,  12,   5,   5,
   0,   0,   5,  24,  24,   5,   0,   0,
   5,  -5, -10,   0,   0, -10,  -5,   5,
   5,  10,  10, -22, -22,  10,  10,   5,
   0,   0,   0,   0,   0,   0,   0,   0,
];

const PAWN_PST_EG = [
   0,   0,   0,   0,   0,   0,   0,   0,
  85,  85,  85,  85,  85,  85,  85,  85,
  50,  50,  50,  50,  50,  50,  50,  50,
  30,  30,  30,  30,  30,  30,  30,  30,
  15,  15,  15,  15,  15,  15,  15,  15,
   5,   5,   5,   5,   5,   5,   5,   5,
   0,   0,   0,   0,   0,   0,   0,   0,
   0,   0,   0,   0,   0,   0,   0,   0,
];

const KNIGHT_PST = [
 -50, -40, -30, -30, -30, -30, -40, -50,
 -40, -20,   0,   5,   5,   0, -20, -40,
 -30,   5,  15,  20,  20,  15,   5, -30,
 -30,   5,  20,  25,  25,  20,   5, -30,
 -30,   5,  20,  25,  25,  20,   5, -30,
 -30,   5,  15,  20,  20,  15,   5, -30,
 -40, -20,   0,   5,   5,   0, -20, -40,
 -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_PST = [
 -20, -10, -10, -10, -10, -10, -10, -20,
 -10,   5,   0,   0,   0,   0,   5, -10,
 -10,  10,  12,  15,  15,  12,  10, -10,
 -10,   5,  15,  18,  18,  15,   5, -10,
 -10,   5,  18,  18,  18,  18,   5, -10,
 -10,  12,  12,  15,  15,  12,  12, -10,
 -10,  12,   0,   5,   5,   0,  12, -10,
 -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_PST = [
   0,   5,   5,  10,  10,   5,   5,   0,
  15,  20,  20,  20,  20,  20,  20,  15,
  -5,   0,   0,   5,   5,   0,   0,  -5,
  -5,   0,   0,   5,   5,   0,   0,  -5,
  -5,   0,   0,   5,   5,   0,   0,  -5,
  -5,   0,   0,   5,   5,   0,   0,  -5,
  -5,   0,   0,   5,   5,   0,   0,  -5,
   0,   0,   5,  12,  12,   5,   0,   0,
];

const QUEEN_PST = [
 -20, -10, -10,  -5,  -5, -10, -10, -20,
 -10,   0,   5,   0,   0,   0,   0, -10,
 -10,   5,   5,   8,   8,   5,   0, -10,
   0,   0,   8,  10,  10,   8,   0,  -5,
  -5,   0,   8,  10,  10,   8,   0,  -5,
 -10,   5,   8,   8,   8,   5,   0, -10,
 -10,   0,   5,   0,   0,   0,   0, -10,
 -20, -10, -10,  -5,  -5, -10, -10, -20,
];

const KING_PST_MG = [
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -30, -40, -40, -50, -50, -40, -40, -30,
 -20, -30, -30, -40, -40, -30, -30, -20,
 -10, -20, -20, -20, -20, -20, -20, -10,
  20,  20,   0,   0,   0,   0,  20,  20,
  20,  32,  12,   0,   0,  12,  32,  20,
];

const KING_PST_EG = [
 -50, -35, -30, -25, -25, -30, -35, -50,
 -30, -15, -10,   0,   0, -10, -15, -30,
 -30, -10,  20,  30,  30,  20, -10, -30,
 -30, -10,  30,  40,  40,  30, -10, -30,
 -30, -10,  30,  40,  40,  30, -10, -30,
 -30, -10,  20,  30,  30,  20, -10, -30,
 -30, -25, -15,   0,   0, -15, -25, -30,
 -50, -35, -30, -25, -25, -30, -35, -50,
];

function flipIndex(idx: number): number {
  const rank = Math.floor(idx / 8);
  const file = idx % 8;
  return (7 - rank) * 8 + file;
}

/**
 * Evaluates board position from the perspective of White (positive = White advantage, negative = Black advantage).
 * Includes tapered Middlegame/Endgame PSTs, Bishop Pair, Rook on Open Files, Pawn Structure, and Endgame King Mop-up.
 */
export function evaluateBoard(chess: Chess, detailed = true): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const board = chess.board();
  let whiteMaterial = 0;
  let blackMaterial = 0;
  let mgPositional = 0;
  let egPositional = 0;

  let whiteBishops = 0;
  let blackBishops = 0;
  let nonPawnMaterial = 0;

  const whitePawnsPerFile = new Int8Array(8);
  const blackPawnsPerFile = new Int8Array(8);
  const whitePawnRanks: number[] = [-1, -1, -1, -1, -1, -1, -1, -1];
  const blackPawnRanks: number[] = [8, 8, 8, 8, 8, 8, 8, 8];

  let whiteKingRank = 7;
  let whiteKingFile = 4;
  let blackKingRank = 0;
  let blackKingFile = 4;

  const rooks: Array<{ color: Color; r: number; c: number }> = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const idx = r * 8 + c;
      const pstIdx = piece.color === 'w' ? idx : flipIndex(idx);
      const val = PIECE_VALUES[piece.type];

      if (piece.color === 'w') {
        whiteMaterial += val;
      } else {
        blackMaterial += val;
      }

      if (piece.type !== 'p' && piece.type !== 'k') {
        nonPawnMaterial += val;
      }

      let mgBonus = 0;
      let egBonus = 0;

      switch (piece.type) {
        case 'p':
          mgBonus = PAWN_PST_MG[pstIdx];
          egBonus = PAWN_PST_EG[pstIdx];
          if (piece.color === 'w') {
            whitePawnsPerFile[c]++;
            if (whitePawnRanks[c] === -1 || r < whitePawnRanks[c]) {
              whitePawnRanks[c] = r;
            }
          } else {
            blackPawnsPerFile[c]++;
            if (blackPawnRanks[c] === 8 || r > blackPawnRanks[c]) {
              blackPawnRanks[c] = r;
            }
          }
          break;
        case 'n':
          mgBonus = KNIGHT_PST[pstIdx];
          egBonus = KNIGHT_PST[pstIdx];
          break;
        case 'b':
          mgBonus = BISHOP_PST[pstIdx];
          egBonus = BISHOP_PST[pstIdx];
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
          break;
        case 'r':
          mgBonus = ROOK_PST[pstIdx];
          egBonus = ROOK_PST[pstIdx];
          if (detailed) rooks.push({ color: piece.color, r, c });
          break;
        case 'q':
          mgBonus = QUEEN_PST[pstIdx];
          egBonus = QUEEN_PST[pstIdx];
          break;
        case 'k':
          mgBonus = KING_PST_MG[pstIdx];
          egBonus = KING_PST_EG[pstIdx];
          if (piece.color === 'w') {
            whiteKingRank = r;
            whiteKingFile = c;
          } else {
            blackKingRank = r;
            blackKingFile = c;
          }
          break;
      }

      if (piece.color === 'w') {
        mgPositional += mgBonus;
        egPositional += egBonus;
      } else {
        mgPositional -= mgBonus;
        egPositional -= egBonus;
      }
    }
  }

  // Phase calculation: 0.0 (pure endgame) to 1.0 (opening/middlegame)
  const maxNonPawnMaterial = 6200;
  const mgWeight = Math.min(1, nonPawnMaterial / maxNonPawnMaterial);
  const egWeight = 1 - mgWeight;

  let score = (whiteMaterial - blackMaterial) + (mgPositional * mgWeight + egPositional * egWeight);

  if (!detailed) {
    return Math.round(score);
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) score += 35;
  if (blackBishops >= 2) score -= 35;

  // Pawn structure: doubled pawns, isolated pawns, passed pawns
  for (let f = 0; f < 8; f++) {
    if (whitePawnsPerFile[f] > 1) score -= (whitePawnsPerFile[f] - 1) * 16;
    if (blackPawnsPerFile[f] > 1) score += (blackPawnsPerFile[f] - 1) * 16;

    const hasWhiteNeighbor = (f > 0 && whitePawnsPerFile[f - 1] > 0) || (f < 7 && whitePawnsPerFile[f + 1] > 0);
    if (whitePawnsPerFile[f] > 0 && !hasWhiteNeighbor) score -= 14;

    const hasBlackNeighbor = (f > 0 && blackPawnsPerFile[f - 1] > 0) || (f < 7 && blackPawnsPerFile[f + 1] > 0);
    if (blackPawnsPerFile[f] > 0 && !hasBlackNeighbor) score += 14;

    // Passed pawn check for White
    if (whitePawnRanks[f] !== -1) {
      const wr = whitePawnRanks[f];
      const blockedByBlack =
        (blackPawnRanks[f] !== 8 && blackPawnRanks[f] < wr) ||
        (f > 0 && blackPawnRanks[f - 1] !== 8 && blackPawnRanks[f - 1] < wr) ||
        (f < 7 && blackPawnRanks[f + 1] !== 8 && blackPawnRanks[f + 1] < wr);
      if (!blockedByBlack) {
        const advancement = 7 - wr;
        score += (advancement * advancement) * (4 + egWeight * 8);
      }
    }

    // Passed pawn check for Black
    if (blackPawnRanks[f] !== 8) {
      const br = blackPawnRanks[f];
      const blockedByWhite =
        (whitePawnRanks[f] !== -1 && whitePawnRanks[f] > br) ||
        (f > 0 && whitePawnRanks[f - 1] !== -1 && whitePawnRanks[f - 1] > br) ||
        (f < 7 && whitePawnRanks[f + 1] !== -1 && whitePawnRanks[f + 1] > br);
      if (!blockedByWhite) {
        const advancement = br;
        score -= (advancement * advancement) * (4 + egWeight * 8);
      }
    }
  }

  // Rooks on open / semi-open files
  for (const rk of rooks) {
    const friendlyPawns = rk.color === 'w' ? whitePawnsPerFile[rk.c] : blackPawnsPerFile[rk.c];
    const enemyPawns = rk.color === 'w' ? blackPawnsPerFile[rk.c] : whitePawnsPerFile[rk.c];
    let bonus = 0;
    if (friendlyPawns === 0 && enemyPawns === 0) bonus = 22;
    else if (friendlyPawns === 0) bonus = 12;
    if (rk.color === 'w') score += bonus;
    else score -= bonus;
  }

  // Endgame mop-up evaluation: push losing king to edge & bring winning king close
  if (egWeight > 0.5 && Math.abs(whiteMaterial - blackMaterial) >= 200) {
    const kingManhattanDist = Math.abs(whiteKingRank - blackKingRank) + Math.abs(whiteKingFile - blackKingFile);
    if (whiteMaterial > blackMaterial) {
      const blackKingCenterDist = Math.abs(3.5 - blackKingRank) + Math.abs(3.5 - blackKingFile);
      score += egWeight * (blackKingCenterDist * 14 + (14 - kingManhattanDist) * 6);
    } else {
      const whiteKingCenterDist = Math.abs(3.5 - whiteKingRank) + Math.abs(3.5 - whiteKingFile);
      score -= egWeight * (whiteKingCenterDist * 14 + (14 - kingManhattanDist) * 6);
    }
  }

  // Check bonus
  if (chess.inCheck()) {
    score += chess.turn() === 'w' ? -25 : 25;
  }

  return Math.round(score);
}

export interface CapturedAndMaterialInfo {
  capturedByWhite: PieceSymbol[]; // Black pieces captured by White
  capturedByBlack: PieceSymbol[]; // White pieces captured by Black
  whiteMaterialScore: number;
  blackMaterialScore: number;
  advantage: number; // positive = White leads, negative = Black leads
}

const INITIAL_COUNTS: Record<PieceSymbol, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
  k: 1,
};

const DISPLAY_ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

export function getCapturedAndMaterial(fen: string): CapturedAndMaterialInfo {
  const chess = new Chess(fen);
  const board = chess.board();

  const currentWhite: Record<PieceSymbol, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
  const currentBlack: Record<PieceSymbol, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };

  let whiteMaterialScore = 0;
  let blackMaterialScore = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (piece.color === 'w') {
        currentWhite[piece.type]++;
        whiteMaterialScore += MATERIAL_DISPLAY_VALUES[piece.type];
      } else {
        currentBlack[piece.type]++;
        blackMaterialScore += MATERIAL_DISPLAY_VALUES[piece.type];
      }
    }
  }

  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  for (const type of DISPLAY_ORDER) {
    const missingBlack = Math.max(0, INITIAL_COUNTS[type] - currentBlack[type]);
    for (let i = 0; i < missingBlack; i++) {
      capturedByWhite.push(type);
    }

    const missingWhite = Math.max(0, INITIAL_COUNTS[type] - currentWhite[type]);
    for (let i = 0; i < missingWhite; i++) {
      capturedByBlack.push(type);
    }
  }

  return {
    capturedByWhite,
    capturedByBlack,
    whiteMaterialScore,
    blackMaterialScore,
    advantage: whiteMaterialScore - blackMaterialScore,
  };
}
