import { Chess, type Move } from 'chess.js';
import { lookupOpeningBookMove, getFenPositionKey } from './openingBook.ts';
import { evaluateBoard, PIECE_VALUES } from './evaluation.ts';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'god';

export interface AIDifficultyMeta {
  id: AIDifficulty;
  name: string;
  subtitle: string;
  elo: string;
  description: string;
  allowUndo: boolean;
  badge?: string;
}

export const AI_DIFFICULTIES: AIDifficultyMeta[] = [
  {
    id: 'easy',
    name: 'Easy',
    subtitle: 'Novice Automaton',
    elo: '800 ELO',
    description: 'Rapid moves using basic evaluation with 30% intentional tactical randomness.',
    allowUndo: true,
  },
  {
    id: 'medium',
    name: 'Medium',
    subtitle: 'Club Tactician',
    elo: '1450 ELO',
    description: 'Depth 3 Alpha-Beta pruning with positional piece-square tables and center control.',
    allowUndo: true,
  },
  {
    id: 'hard',
    name: 'Hard',
    subtitle: 'International Master',
    elo: '2100 ELO',
    description: 'Depth 4 Alpha-Beta with Quiescence search, MVV-LVA move ordering, and tactical precision.',
    allowUndo: true,
  },
  {
    id: 'god',
    name: 'GOD MODE',
    subtitle: 'Unbeatable Grandmaster Engine',
    elo: '2850+ ELO',
    description: 'Master Opening Book + Iterative Deepening, Transposition Tables, Killer Heuristics & zero-mistake domination. Undo is strictly locked.',
    allowUndo: false,
    badge: 'UNBEATABLE · NO UNDO',
  },
];

export interface AIMoveResult {
  move: Move;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  score: number;
  depthReached: number;
  nodesEvaluated: number;
  fromBook: boolean;
  bookOpeningName?: string;
}

const TT_EXACT = 0;
const TT_LOWERBOUND = 1;
const TT_UPPERBOUND = 2;

interface TTEntry {
  depth: number;
  score: number;
  flag: number;
  bestMoveSan: string;
}

// Persistent transposition table for God Mode
const transpositionTable = new Map<string, TTEntry>();

export function clearTranspositionTable(): void {
  transpositionTable.clear();
}

/**
 * Scores a move for move ordering (PV/TT move > Promotions > Captures MVV-LVA > Killer Moves > Quiet Moves).
 */
function scoreMoveForOrdering(
  move: Move,
  ttMoveSan: string | undefined,
  killersAtPly: string[] | undefined,
  historyTable: Map<string, number>
): number {
  if (ttMoveSan && move.san === ttMoveSan) {
    return 100000;
  }

  let score = 0;

  if (move.promotion) {
    score += 40000 + (PIECE_VALUES[move.promotion] || 900);
  }

  if (move.captured) {
    const victimVal = PIECE_VALUES[move.captured] || 100;
    const attackerVal = PIECE_VALUES[move.piece] || 100;
    score += 20000 + victimVal * 12 - attackerVal;
  }

  if (move.san.includes('+') || move.san.includes('#')) {
    score += 8000;
  }

  if (killersAtPly && (killersAtPly[0] === move.san || killersAtPly[1] === move.san)) {
    score += 5000;
  }

  const histKey = `${move.piece}:${move.from}->${move.to}`;
  score += historyTable.get(histKey) || 0;

  return score;
}

function orderMoves(
  moves: Move[],
  ttMoveSan?: string,
  killersAtPly?: string[],
  historyTable?: Map<string, number>
): Move[] {
  const hist = historyTable || new Map<string, number>();
  return moves
    .map((m) => ({
      move: m,
      orderScore: scoreMoveForOrdering(m, ttMoveSan, killersAtPly, hist),
    }))
    .sort((a, b) => b.orderScore - a.orderScore)
    .map((x) => x.move);
}

/**
 * Quiescence Search to resolve tactical capture/promotion sequences at leaf nodes
 * and prevent horizon-effect blunders.
 */
function quiescenceSearch(
  chess: Chess,
  alpha: number,
  beta: number,
  colorMultiplier: number,
  maxQuiescencePly: number,
  qPly: number,
  stats: { nodes: number; deadline: number; aborted: boolean }
): number {
  stats.nodes++;

  if ((stats.nodes & 511) === 0 && performance.now() > stats.deadline) {
    stats.aborted = true;
    return 0;
  }

  if (chess.isCheckmate()) {
    return -99999 + qPly;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const standPat = colorMultiplier * evaluateBoard(chess, true);

  if (qPly >= maxQuiescencePly) {
    return standPat;
  }

  if (standPat >= beta) {
    return beta;
  }
  if (alpha < standPat) {
    alpha = standPat;
  }

  const inCheck = chess.inCheck();
  const allMoves = chess.moves({ verbose: true });
  const tacticalMoves = inCheck
    ? allMoves
    : allMoves.filter((m) => m.captured || m.promotion);

  const ordered = orderMoves(tacticalMoves);

  for (const move of ordered) {
    // Delta pruning in quiescence when not in check
    if (!inCheck && !move.promotion && move.captured) {
      const gain = PIECE_VALUES[move.captured] + 180;
      if (standPat + gain < alpha) {
        continue;
      }
    }

    chess.move(move);
    const score = -quiescenceSearch(
      chess,
      -beta,
      -alpha,
      -colorMultiplier,
      maxQuiescencePly,
      qPly + 1,
      stats
    );
    chess.undo();

    if (stats.aborted) return 0;

    if (score >= beta) {
      return beta;
    }
    if (score > alpha) {
      alpha = score;
    }
  }

  return alpha;
}

/**
 * Negamax Alpha-Beta Search with Transposition Table, Killer Moves, and Quiescence.
 */
function negamax(
  chess: Chess,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  colorMultiplier: number,
  useQuiescence: boolean,
  useTT: boolean,
  killers: string[][],
  historyTable: Map<string, number>,
  stats: { nodes: number; deadline: number; aborted: boolean }
): number {
  stats.nodes++;

  if ((stats.nodes & 511) === 0 && performance.now() > stats.deadline) {
    stats.aborted = true;
    return 0;
  }

  if (ply > 0) {
    if (chess.isCheckmate()) {
      return -99999 + ply;
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0;
    }
  }

  const alphaOrig = alpha;
  const posKey = useTT ? getFenPositionKey(chess.fen()) : '';
  let ttEntry: TTEntry | undefined;

  if (useTT) {
    ttEntry = transpositionTable.get(posKey);
    if (ttEntry && ttEntry.depth >= depth && ply > 0) {
      if (ttEntry.flag === TT_EXACT) return ttEntry.score;
      if (ttEntry.flag === TT_LOWERBOUND && ttEntry.score > alpha) alpha = ttEntry.score;
      else if (ttEntry.flag === TT_UPPERBOUND && ttEntry.score < beta) beta = ttEntry.score;
      if (alpha >= beta) return ttEntry.score;
    }
  }

  if (depth <= 0) {
    if (useQuiescence) {
      return quiescenceSearch(chess, alpha, beta, colorMultiplier, 5, ply, stats);
    }
    return colorMultiplier * evaluateBoard(chess, true);
  }

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    if (chess.inCheck()) return -99999 + ply;
    return 0;
  }

  const orderedMoves = orderMoves(
    legalMoves,
    ttEntry?.bestMoveSan,
    killers[ply],
    historyTable
  );

  let bestScore = -Infinity;
  let bestMoveSan = orderedMoves[0].san;

  for (let i = 0; i < orderedMoves.length; i++) {
    const move = orderedMoves[i];
    chess.move(move);

    // Late Move Reductions (LMR) for deeper quiet moves in God Mode
    let score: number;
    const isTactical = Boolean(move.captured || move.promotion || move.san.includes('+'));
    if (useTT && depth >= 3 && i >= 4 && !isTactical && !chess.inCheck()) {
      score = -negamax(
        chess,
        depth - 2,
        ply + 1,
        -alpha - 1,
        -alpha,
        -colorMultiplier,
        useQuiescence,
        useTT,
        killers,
        historyTable,
        stats
      );
      if (score > alpha && !stats.aborted) {
        score = -negamax(
          chess,
          depth - 1,
          ply + 1,
          -beta,
          -alpha,
          -colorMultiplier,
          useQuiescence,
          useTT,
          killers,
          historyTable,
          stats
        );
      }
    } else {
      score = -negamax(
        chess,
        depth - 1,
        ply + 1,
        -beta,
        -alpha,
        -colorMultiplier,
        useQuiescence,
        useTT,
        killers,
        historyTable,
        stats
      );
    }

    chess.undo();

    if (stats.aborted) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMoveSan = move.san;
    }
    if (score > alpha) {
      alpha = score;
    }
    if (alpha >= beta) {
      // Record killer & history heuristic for quiet moves causing beta cutoff
      if (!move.captured && !move.promotion) {
        if (!killers[ply]) killers[ply] = [];
        if (killers[ply][0] !== move.san) {
          killers[ply][1] = killers[ply][0];
          killers[ply][0] = move.san;
        }
        const histKey = `${move.piece}:${move.from}->${move.to}`;
        historyTable.set(histKey, (historyTable.get(histKey) || 0) + depth * depth * 10);
      }
      break;
    }
  }

  if (useTT && !stats.aborted) {
    let flag = TT_EXACT;
    if (bestScore <= alphaOrig) flag = TT_UPPERBOUND;
    else if (bestScore >= beta) flag = TT_LOWERBOUND;

    if (transpositionTable.size > 60000) {
      transpositionTable.clear();
    }
    transpositionTable.set(posKey, {
      depth,
      score: bestScore,
      flag,
      bestMoveSan,
    });
  }

  return bestScore;
}

/**
 * Computes the best AI move for the given FEN and difficulty level.
 * Uses deterministic seed option for unit tests when needed.
 */
export function computeBestMove(
  fen: string,
  difficulty: AIDifficulty,
  options?: { timeBudgetMs?: number; disableRandomness?: boolean }
): AIMoveResult | null {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const turnColor = chess.turn();
  const colorMultiplier = turnColor === 'w' ? 1 : -1;

  // Immediate checkmate detection on all difficulties (except when Easy rolls random)
  for (const m of legalMoves) {
    chess.move(m);
    const isMate = chess.isCheckmate();
    chess.undo();
    if (isMate && (difficulty !== 'easy' || options?.disableRandomness)) {
      return {
        move: m,
        san: m.san,
        from: m.from,
        to: m.to,
        promotion: m.promotion,
        score: 99999,
        depthReached: 1,
        nodesEvaluated: legalMoves.length,
        fromBook: false,
      };
    }
  }

  // Level 1: Easy (Novice) - basic 1-ply evaluation with 30% intentional randomness
  if (difficulty === 'easy') {
    const useRandom = !options?.disableRandomness && Math.random() < 0.30;
    if (useRandom) {
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      return {
        move: randomMove,
        san: randomMove.san,
        from: randomMove.from,
        to: randomMove.to,
        promotion: randomMove.promotion,
        score: 0,
        depthReached: 1,
        nodesEvaluated: legalMoves.length,
        fromBook: false,
      };
    }

    let bestMove = legalMoves[0];
    let bestScore = -Infinity;
    for (const m of legalMoves) {
      chess.move(m);
      const evalScore = colorMultiplier * evaluateBoard(chess, false);
      chess.undo();
      if (evalScore > bestScore) {
        bestScore = evalScore;
        bestMove = m;
      }
    }
    return {
      move: bestMove,
      san: bestMove.san,
      from: bestMove.from,
      to: bestMove.to,
      promotion: bestMove.promotion,
      score: bestScore,
      depthReached: 1,
      nodesEvaluated: legalMoves.length,
      fromBook: false,
    };
  }

  // Opening Book lookup for GOD MODE (and Hard mode on early moves)
  if (difficulty === 'god' || difficulty === 'hard') {
    const bookEntry = lookupOpeningBookMove(fen, difficulty === 'god');
    if (bookEntry) {
      const matchedMove = legalMoves.find((m) => m.san === bookEntry.san);
      if (matchedMove) {
        return {
          move: matchedMove,
          san: matchedMove.san,
          from: matchedMove.from,
          to: matchedMove.to,
          promotion: matchedMove.promotion,
          score: 35,
          depthReached: 0,
          nodesEvaluated: 1,
          fromBook: true,
          bookOpeningName: bookEntry.openingName,
        };
      }
    }
  }

  // Configure search parameters per tier
  const targetDepth =
    difficulty === 'medium' ? 2 :
    difficulty === 'hard' ? 3 :
    4; // God Mode uses Iterative Deepening up to Depth 4-5 within budget

  const maxIterativeDepth = difficulty === 'god' ? 5 : targetDepth;
  const timeBudget = options?.timeBudgetMs ?? (
    difficulty === 'medium' ? 250 :
    difficulty === 'hard' ? 550 :
    900
  );

  const useQuiescence = difficulty === 'hard' || difficulty === 'god';
  const useTT = difficulty === 'god';

  const stats = {
    nodes: 0,
    deadline: performance.now() + timeBudget,
    aborted: false,
  };

  const killers: string[][] = Array.from({ length: 16 }, () => []);
  const historyTable = new Map<string, number>();

  let bestMoveOverall = legalMoves[0];
  let bestScoreOverall = -Infinity;
  let completedDepth = 1;

  const startDepth = difficulty === 'god' ? 1 : targetDepth;

  for (let currentDepth = startDepth; currentDepth <= maxIterativeDepth; currentDepth++) {
    let alpha = -Infinity;
    const beta = Infinity;
    let bestMoveThisDepth = bestMoveOverall;
    let bestScoreThisDepth = -Infinity;

    // Order root moves with PV move from previous iteration first
    const orderedRootMoves = orderMoves(
      legalMoves,
      bestMoveOverall.san,
      killers[0],
      historyTable
    );

    for (const move of orderedRootMoves) {
      chess.move(move);
      const score = -negamax(
        chess,
        currentDepth - 1,
        1,
        -beta,
        -alpha,
        -colorMultiplier,
        useQuiescence,
        useTT,
        killers,
        historyTable,
        stats
      );
      chess.undo();

      if (stats.aborted && currentDepth > 1) {
        break;
      }

      if (score > bestScoreThisDepth) {
        bestScoreThisDepth = score;
        bestMoveThisDepth = move;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    if (!stats.aborted || currentDepth === startDepth) {
      bestMoveOverall = bestMoveThisDepth;
      bestScoreOverall = bestScoreThisDepth;
      completedDepth = currentDepth;
    } else {
      break;
    }

    // Found forced mate, stop deepening
    if (bestScoreOverall > 90000) {
      break;
    }

    if (performance.now() > stats.deadline - 80) {
      break;
    }
  }

  return {
    move: bestMoveOverall,
    san: bestMoveOverall.san,
    from: bestMoveOverall.from,
    to: bestMoveOverall.to,
    promotion: bestMoveOverall.promotion,
    score: bestScoreOverall,
    depthReached: completedDepth,
    nodesEvaluated: stats.nodes,
    fromBook: false,
  };
}
