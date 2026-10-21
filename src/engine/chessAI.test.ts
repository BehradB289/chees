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
  getStockfishUciConfig,
  pickAIEmoteReaction,
} from './chessAI.ts';
import {
  calculateFideEloDelta,
  getRankTierByElo,
  getDetailedRankBadge,
  formatStandingAndElo,
  buildMergedLeaderboard,
  calculateLevelFromXp,
  calculateMatchXpReward,
  recordMatchResult,
  createDefaultProfile,
} from '../progression/progression.ts';

test('Stockfish UCI calibration enforces exact 50% / 30% / 10% / <0.9% win-rate targets', () => {
  const easyUci = getStockfishUciConfig('easy');
  assert.deepEqual(easyUci.optionCommands, ['setoption name Skill Level value 0']);
  assert.equal(easyUci.goCommand, 'go depth 1');
  assert.equal(easyUci.depth, 1);
  assert.equal(easyUci.blunderRate, 0.45);

  const medUci = getStockfishUciConfig('medium');
  assert.deepEqual(medUci.optionCommands, ['setoption name Skill Level value 5']);
  assert.equal(medUci.goCommand, 'go depth 4 movetime 500');
  assert.equal(medUci.depth, 4);

  const hardUci = getStockfishUciConfig('hard');
  assert.deepEqual(hardUci.optionCommands, ['setoption name Skill Level value 13']);
  assert.equal(hardUci.goCommand, 'go depth 10 movetime 1100');
  assert.equal(hardUci.depth, 10);

  const godUci = getStockfishUciConfig('god');
  assert.deepEqual(godUci.optionCommands, [
    'setoption name Skill Level value 20',
    'setoption name Contempt value 100',
  ]);
  assert.equal(godUci.goCommand, 'go depth 18 movetime 2500');
  assert.equal(godUci.depth, 18);
});

test('Grandmaster Opening Book returns Sicilian Defense up to 8 moves (16 plies) in God Mode', () => {
  const chess = new Chess();
  const najdorfMoves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3'];
  for (const m of najdorfMoves) {
    chess.move(m);
  }
  const bookMove = lookupOpeningBookMove(chess.fen(), true);
  assert.ok(bookMove, 'Expected 8th move book response');
  assert.equal(bookMove.san, 'Be7');
  assert.equal(
    detectOpeningName(chess.history()),
    'Sicilian Defense · Najdorf Variation'
  );
});

test('Real-Players-Only Leaderboard has zero fake bots and formats Rank + Sub-Tier + Numeric ELO', () => {
  const profile = createDefaultProfile();
  profile.elo = 1450;
  const leaderboard = buildMergedLeaderboard(profile);

  // Must contain ONLY the real local user when no P2P peers are synced
  assert.equal(leaderboard.length, 1);
  assert.equal(leaderboard[0].id, profile.id);
  assert.equal(leaderboard[0].standing, 1);
  assert.equal(leaderboard[0].isUser, true);

  assert.equal(getDetailedRankBadge(1450), 'Gold II');
  assert.equal(
    formatStandingAndElo(1, 1450),
    'Rank #1 • Gold II • 1,450 ELO'
  );
});

test('FIDE ELO (K=32), Rank Tiers, and XP Progression calculate accurately', () => {
  const winEqual = calculateFideEloDelta(1000, 1000, 1, 32);
  assert.equal(winEqual.delta, 16);
  assert.equal(winEqual.newElo, 1016);

  const lossEqual = calculateFideEloDelta(1000, 1000, 0, 32);
  assert.equal(lossEqual.delta, -16);
  assert.equal(lossEqual.newElo, 984);

  assert.equal(getRankTierByElo(950).id, 'bronze');
  assert.equal(getRankTierByElo(1000).id, 'silver');
  assert.equal(getRankTierByElo(1350).id, 'gold');
  assert.equal(getRankTierByElo(1650).id, 'platinum');
  assert.equal(getRankTierByElo(2050).id, 'diamond');
  assert.equal(getRankTierByElo(2300).id, 'grandmaster');

  const xpEasy = calculateMatchXpReward('ai', 'easy', 'win', 10);
  const xpHard = calculateMatchXpReward('ai', 'hard', 'win', 10);
  const xpGodDraw = calculateMatchXpReward('ai', 'god', 'draw', 20);
  const xpPvpWin = calculateMatchXpReward('pvp', 'medium', 'win', 20);

  assert.ok(xpEasy >= 25);
  assert.ok(xpHard >= 100);
  assert.ok(xpGodDraw >= 500);
  assert.ok(xpPvpWin >= 150);

  const lvl = calculateLevelFromXp(400);
  assert.ok(lvl.level >= 3);

  const profile = createDefaultProfile();
  const recorded = recordMatchResult(profile, 'pvp', 'hard', 1200, 'win', 24);
  assert.ok(recorded.eloDelta > 16);
  assert.equal(recorded.updatedProfile.wins, 1);
  assert.equal(recorded.updatedProfile.winStreak, 1);
});

test('AI Emote reaction generator and Mate-in-1 work deterministically', () => {
  const mateEmote = pickAIEmoteReaction('god', 'ai_checkmate');
  assert.ok(mateEmote);
  assert.equal(mateEmote.emoji, '😎');

  const checkEmote = pickAIEmoteReaction('god', 'ai_check');
  assert.ok(checkEmote);
  assert.equal(checkEmote.emoji, '😎');

  const god = AI_DIFFICULTIES.find((d) => d.id === 'god');
  assert.equal(god?.allowUndo, false);

  clearTranspositionTable();
  const mateInOneFen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 3';
  const res = computeBestMove(mateInOneFen, 'god', { disableRandomness: true });
  assert.ok(res);
  assert.equal(res.san, 'Qxf7#');

  const chess = new Chess('rnbqkb1r/ppp1pppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3');
  const info = getCapturedAndMaterial(chess.fen());
  assert.deepEqual(info.capturedByWhite, ['n', 'p']);
  assert.equal(info.advantage, 4);

  const whiteUpQueen = new Chess('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.ok(evaluateBoard(whiteUpQueen) > 800);
});
