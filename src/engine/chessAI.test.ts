import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  lookupOpeningBookMove,
  detectOpeningName,
} from './openingBook.ts';
import {
  evaluateBoard,
  getCapturedAndMaterial,
} from './evaluation.ts';
import {
  computeBestMove,
  AI_DIFFICULTIES,
  clearTranspositionTable,
} from './chessAI.ts';

test('Grandmaster Opening Book returns Sicilian Defense against 1. e4 in God Mode', () => {
  const chess = new Chess();
  chess.move('e4');
  const bookMove = lookupOpeningBookMove(chess.fen(), true);
  assert.ok(bookMove, 'Expected a book move for 1. e4');
  assert.equal(bookMove.san, 'c5');
  assert.equal(bookMove.openingName, 'Sicilian Defense');
});

test('Opening name detector identifies Ruy Lopez, Sicilian Najdorf, and Queen’s Gambit', () => {
  assert.equal(
    detectOpeningName(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']),
    'Sicilian Defense · Najdorf Variation'
  );
  assert.equal(
    detectOpeningName(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']),
    'Ruy Lopez · Morphy Defense'
  );
  assert.equal(
    detectOpeningName(['d4', 'd5', 'c4', 'e6']),
    "Queen's Gambit Declined"
  );
});

test('getCapturedAndMaterial accurately computes captured pieces and material advantage', () => {
  const chess = new Chess();
  // Capture black's d5 pawn and f6 knight
  chess.load('rnbqkb1r/ppp1pppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3');
  const info = getCapturedAndMaterial(chess.fen());
  assert.deepEqual(info.capturedByWhite, ['n', 'p']);
  assert.deepEqual(info.capturedByBlack, []);
  assert.equal(info.advantage, 4); // +3 knight +1 pawn = +4
});

test('evaluateBoard scores checkmate and material advantage accurately', () => {
  // Fool's mate (Black checkmates White)
  const foolsMate = new Chess();
  foolsMate.move('f3');
  foolsMate.move('e5');
  foolsMate.move('g4');
  foolsMate.move('Qh4#');
  assert.equal(evaluateBoard(foolsMate), -99999);

  // White up a full Queen
  const whiteUpQueen = new Chess('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.ok(evaluateBoard(whiteUpQueen) > 800);
});

test('AI difficulties enforce Undo restriction strictly on God Mode', () => {
  const easy = AI_DIFFICULTIES.find((d) => d.id === 'easy');
  const medium = AI_DIFFICULTIES.find((d) => d.id === 'medium');
  const hard = AI_DIFFICULTIES.find((d) => d.id === 'hard');
  const god = AI_DIFFICULTIES.find((d) => d.id === 'god');

  assert.equal(easy?.allowUndo, true);
  assert.equal(medium?.allowUndo, true);
  assert.equal(hard?.allowUndo, true);
  assert.equal(god?.allowUndo, false);
});

test('All AI tiers find immediate Mate in 1 and capture undefended Queen', () => {
  clearTranspositionTable();
  // Scholar's mate setup: White to play Qxf7#
  const mateInOneFen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 3';

  for (const tier of ['easy', 'medium', 'hard', 'god'] as const) {
    const res = computeBestMove(mateInOneFen, tier, { disableRandomness: true });
    assert.ok(res, `Expected move from ${tier}`);
    assert.equal(res.san, 'Qxf7#', `Tier ${tier} should play Qxf7#`);
  }

  // Undefended Black Queen on d5, White Knight on c3 can capture Nxd5
  const freeQueenFen = 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 2';
  const godRes = computeBestMove(freeQueenFen, 'god', { timeBudgetMs: 400 });
  assert.ok(godRes);
  assert.equal(godRes.san, 'Nxd5');
});
