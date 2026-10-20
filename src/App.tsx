import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Color, Move } from 'chess.js';
import {
  AIDifficulty,
  computeBestMove,
  clearTranspositionTable,
} from './engine/chessAI.ts';
import { detectOpeningName } from './engine/openingBook.ts';
import { getCapturedAndMaterial } from './engine/evaluation.ts';
import { ChessScene3D } from './three/ChessScene3D.tsx';
import { MainMenuOverlay } from './components/MainMenuOverlay.tsx';
import { GameHud, MoveLogPair } from './components/GameHud.tsx';
import { soundFX } from './utils/sound.ts';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

function findCheckedKingSquare(chess: Chess): string | null {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === turn) {
        return `${files[c]}${ranks[r]}`;
      }
    }
  }
  return null;
}

export default function App() {
  const initialAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const chessRef = useRef<Chess>(new Chess());
  const aiTimerRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>(
    initialAutostart ? 'playing' : 'title'
  );
  const [difficulty, setDifficulty] = useState<AIDifficulty>('god');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [fen, setFen] = useState<string>(() => chessRef.current.fen());
  const [historySan, setHistorySan] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const [cameraFlipped, setCameraFlipped] = useState<boolean>(false);
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    color: Color;
  } | null>(null);

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
    document.body.dataset.difficulty = difficulty;
  }, [gameState, difficulty]);

  const clearPendingAITimer = useCallback(() => {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, []);

  const syncChessState = useCallback((lastMoved?: { from: string; to: string } | null) => {
    const chess = chessRef.current;
    const currentFen = chess.fen();
    const movesHistory = chess.history();

    setFen(currentFen);
    setHistorySan(movesHistory);
    if (lastMoved !== undefined) {
      setLastMove(lastMoved);
    }

    if (chess.isGameOver()) {
      setIsAIThinking(false);
      setGameState('gameover');
      if (chess.isCheckmate()) {
        const winner: Color = chess.turn() === 'w' ? 'b' : 'w';
        soundFX.playGameOver(winner === playerColor);
      } else {
        soundFX.playGameOver(null);
      }
    }
  }, [playerColor]);

  // Trigger AI move when it is AI's turn in 'playing' state
  useEffect(() => {
    clearPendingAITimer();
    const chess = chessRef.current;

    if (gameState !== 'playing' || chess.isGameOver()) {
      setIsAIThinking(false);
      return;
    }

    const currentTurn = chess.turn();
    if (currentTurn !== playerColor) {
      setIsAIThinking(true);
      const delayMs = difficulty === 'easy' ? 280 : difficulty === 'god' ? 240 : 320;

      aiTimerRef.current = window.setTimeout(() => {
        const currentChess = chessRef.current;
        if (currentChess.isGameOver() || currentChess.turn() === playerColor) {
          setIsAIThinking(false);
          return;
        }

        const aiResult = computeBestMove(currentChess.fen(), difficulty);
        if (aiResult) {
          const executed = currentChess.move({
            from: aiResult.from,
            to: aiResult.to,
            promotion: aiResult.promotion || 'q',
          });

          if (executed) {
            if (currentChess.inCheck()) {
              soundFX.playCheck();
            } else if (executed.captured) {
              soundFX.playCapture();
            } else if (executed.flags.includes('k') || executed.flags.includes('q')) {
              soundFX.playCastle();
            } else {
              soundFX.playMove();
            }
            setIsAIThinking(false);
            setSelectedSquare(null);
            syncChessState({ from: executed.from, to: executed.to });
            return;
          }
        }
        setIsAIThinking(false);
      }, delayMs);
    } else {
      setIsAIThinking(false);
    }

    return () => clearPendingAITimer();
  }, [fen, gameState, playerColor, difficulty, clearPendingAITimer, syncChessState]);

  // Start or restart match
  const handleStartMatch = useCallback(
    (overrideColor?: Color) => {
      clearPendingAITimer();
      clearTranspositionTable();
      const chosenColor = overrideColor ?? playerColor;
      const freshChess = new Chess();
      chessRef.current = freshChess;
      setSelectedSquare(null);
      setPendingPromotion(null);
      setLastMove(null);
      setIsAIThinking(false);
      setFen(freshChess.fen());
      setHistorySan([]);
      setCameraFlipped(chosenColor === 'b');
      setCameraResetTrigger((c) => c + 1);
      setGameState('playing');
      soundFX.playMove();
    },
    [playerColor, clearPendingAITimer]
  );

  // Execute a verified player move
  const executePlayerMove = useCallback(
    (from: string, to: string, promotionPiece?: 'q' | 'r' | 'b' | 'n') => {
      const chess = chessRef.current;
      try {
        const moveObj = chess.move({
          from,
          to,
          promotion: promotionPiece || 'q',
        });
        if (!moveObj) return false;

        if (chess.inCheck()) {
          soundFX.playCheck();
        } else if (moveObj.promotion) {
          soundFX.playPromote();
        } else if (moveObj.captured) {
          soundFX.playCapture();
        } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
          soundFX.playCastle();
        } else {
          soundFX.playMove();
        }

        setSelectedSquare(null);
        setPendingPromotion(null);
        syncChessState({ from: moveObj.from, to: moveObj.to });
        return true;
      } catch {
        return false;
      }
    },
    [syncChessState]
  );

  // Handle clicking/tapping any 3D board square
  const handleSquareClick = useCallback(
    (square: string) => {
      if (gameState !== 'playing' || isAIThinking || pendingPromotion) return;

      const chess = chessRef.current;
      if (chess.turn() !== playerColor) return;

      // If a square is already selected, check if clicked square is a legal destination
      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }

        const candidateMoves = chess
          .moves({ square: selectedSquare as any, verbose: true })
          .filter((m) => m.to === square);

        if (candidateMoves.length > 0) {
          const isPromotion = candidateMoves.some((m) => Boolean(m.promotion));
          if (isPromotion) {
            setPendingPromotion({
              from: selectedSquare,
              to: square,
              color: playerColor,
            });
            soundFX.playSelect();
            return;
          }

          executePlayerMove(selectedSquare, square);
          return;
        }
      }

      // Otherwise, if clicked square contains one of player's own pieces, select it
      const pieceOnSquare = chess.get(square as any);
      if (pieceOnSquare && pieceOnSquare.color === playerColor) {
        setSelectedSquare(square);
        soundFX.playSelect();
      } else {
        setSelectedSquare(null);
      }
    },
    [
      gameState,
      isAIThinking,
      pendingPromotion,
      playerColor,
      selectedSquare,
      executePlayerMove,
    ]
  );

  // Allow executing a legal SAN move directly from the HUD quick-move bar
  const handleExecuteSanMove = useCallback(
    (san: string) => {
      if (gameState !== 'playing' || isAIThinking) return;
      const chess = chessRef.current;
      if (chess.turn() !== playerColor) return;
      try {
        const moveObj = chess.move(san);
        if (moveObj) {
          if (chess.inCheck()) soundFX.playCheck();
          else if (moveObj.captured) soundFX.playCapture();
          else soundFX.playMove();

          setSelectedSquare(null);
          setPendingPromotion(null);
          syncChessState({ from: moveObj.from, to: moveObj.to });
        }
      } catch {
        // ignore invalid SAN
      }
    },
    [gameState, isAIThinking, playerColor, syncChessState]
  );

  // Expose square click helper on window for programmatic verification
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chessSelectSquare = handleSquareClick;
    return () => {
      delete (window as unknown as Record<string, unknown>).__chessSelectSquare;
    };
  }, [handleSquareClick]);

  // Undo Move (strictly disabled in GOD MODE)
  const handleUndoMove = useCallback(() => {
    if (difficulty === 'god' || isAIThinking || gameState !== 'playing') return;
    const chess = chessRef.current;
    const historyLen = chess.history().length;
    if (historyLen === 0) return;

    clearPendingAITimer();
    // Undo back to player's turn (typically 2 plies: AI move + player move)
    chess.undo();
    if (chess.turn() !== playerColor && chess.history().length > 0) {
      chess.undo();
    }

    setSelectedSquare(null);
    setPendingPromotion(null);
    const verboseHist = chess.history({ verbose: true });
    const prevMove = verboseHist.length > 0 ? verboseHist[verboseHist.length - 1] : null;
    syncChessState(prevMove ? { from: prevMove.from, to: prevMove.to } : null);
    soundFX.playSelect();
  }, [difficulty, isAIThinking, gameState, playerColor, clearPendingAITimer, syncChessState]);

  // Global keyboard shortcuts (Enter/Space on Title, P/Esc for Pause, M for Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartMatch();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (pendingPromotion) {
          setPendingPromotion(null);
          return;
        }
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyM') {
        setSoundEnabled((prev) => {
          const next = !prev;
          soundFX.enabled = next;
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, pendingPromotion, handleStartMatch]);

  // Compute derived board readouts
  const currentChess = useMemo(() => new Chess(fen), [fen]);
  const turn = currentChess.turn();
  const inCheck = currentChess.inCheck();
  const inCheckKingSquare = useMemo(() => findCheckedKingSquare(currentChess), [currentChess]);

  const selectedSquareMoves: Move[] = useMemo(() => {
    if (!selectedSquare || gameState !== 'playing') return [];
    try {
      return currentChess.moves({ square: selectedSquare as any, verbose: true });
    } catch {
      return [];
    }
  }, [currentChess, selectedSquare, gameState]);

  const allTurnMoves: Move[] = useMemo(() => {
    if (gameState !== 'playing') return [];
    try {
      return currentChess.moves({ verbose: true });
    } catch {
      return [];
    }
  }, [currentChess, gameState]);

  const capturedInfo = useMemo(() => getCapturedAndMaterial(fen), [fen]);
  const openingName = useMemo(() => detectOpeningName(historySan), [historySan]);

  const movePairs: MoveLogPair[] = useMemo(() => {
    const pairs: MoveLogPair[] = [];
    for (let i = 0; i < historySan.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: historySan[i],
        black: historySan[i + 1],
      });
    }
    return pairs;
  }, [historySan]);

  const canUndo =
    difficulty !== 'god' &&
    gameState === 'playing' &&
    !isAIThinking &&
    historySan.length > 0 &&
    !(playerColor === 'b' && historySan.length < 2);

  const gameOverInfo = useMemo(() => {
    if (!currentChess.isGameOver()) return null;
    if (currentChess.isCheckmate()) {
      const winner: Color = currentChess.turn() === 'w' ? 'b' : 'w';
      const playerWon = winner === playerColor;
      return {
        title: playerWon ? 'Victory by Checkmate' : 'Defeat by Checkmate',
        subtitle: playerWon
          ? `You checkmated the ${difficulty.toUpperCase()} engine in ${movePairs.length} moves.`
          : `The ${difficulty.toUpperCase()} engine delivered checkmate (${
              winner === 'w' ? 'White' : 'Black'
            } wins).`,
        winner,
      };
    }
    if (currentChess.isStalemate()) {
      return {
        title: 'Draw by Stalemate',
        subtitle: 'No legal moves remain and the King is not in check.',
        winner: 'draw' as const,
      };
    }
    if (currentChess.isThreefoldRepetition()) {
      return {
        title: 'Draw by Repetition',
        subtitle: 'The exact board position has occurred three times.',
        winner: 'draw' as const,
      };
    }
    if (currentChess.isInsufficientMaterial()) {
      return {
        title: 'Draw · Insufficient Material',
        subtitle: 'Neither side has sufficient material to force checkmate.',
        winner: 'draw' as const,
      };
    }
    return {
      title: 'Match Drawn',
      subtitle: '50-move rule or formal draw reached.',
      winner: 'draw' as const,
    };
  }, [currentChess, playerColor, difficulty, movePairs.length]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090b10] text-slate-100 select-none">
      {/* Persistent 3D WebGL Chessboard Viewport */}
      <ChessScene3D
        fen={fen}
        selectedSquare={selectedSquare}
        legalMoves={selectedSquareMoves}
        lastMove={lastMove}
        inCheckKingSquare={inCheckKingSquare}
        cameraFlipped={cameraFlipped}
        cameraResetTrigger={cameraResetTrigger}
        isTitleScreen={gameState === 'title'}
        onSquareClick={handleSquareClick}
      />

      {/* Title / Main Menu Modal Overlay */}
      {gameState === 'title' && (
        <MainMenuOverlay
          difficulty={difficulty}
          playerColor={playerColor}
          onSelectDifficulty={(diff) => {
            setDifficulty(diff);
            soundFX.playSelect();
          }}
          onSelectColor={(col) => {
            setPlayerColor(col);
            soundFX.playSelect();
          }}
          onStartMatch={() => handleStartMatch()}
        />
      )}

      {/* Active In-Game HUD & Status Overlays */}
      {gameState !== 'title' && (
        <GameHud
          gameState={gameState}
          difficulty={difficulty}
          playerColor={playerColor}
          turn={turn}
          inCheck={inCheck}
          isAIThinking={isAIThinking}
          openingName={openingName}
          selectedSquare={selectedSquare}
          selectedSquareMoves={selectedSquareMoves}
          allTurnMoves={allTurnMoves}
          capturedInfo={capturedInfo}
          movePairs={movePairs}
          totalHalfMoves={historySan.length}
          canUndo={canUndo}
          soundEnabled={soundEnabled}
          gameOverInfo={gameOverInfo}
          pendingPromotion={pendingPromotion}
          onSelectPromotion={(piece) => {
            if (pendingPromotion) {
              executePlayerMove(pendingPromotion.from, pendingPromotion.to, piece);
            }
          }}
          onCancelPromotion={() => setPendingPromotion(null)}
          onExecuteSanMove={handleExecuteSanMove}
          onUndoMove={handleUndoMove}
          onFlipCamera={() => {
            setCameraFlipped((f) => !f);
            soundFX.playSelect();
          }}
          onResetCamera={() => {
            setCameraResetTrigger((c) => c + 1);
            soundFX.playSelect();
          }}
          onToggleSound={() => {
            setSoundEnabled((prev) => {
              const next = !prev;
              soundFX.enabled = next;
              return next;
            });
          }}
          onOpenNewGameMenu={() => {
            clearPendingAITimer();
            setIsAIThinking(false);
            setGameState('title');
          }}
          onQuickRematch={() => handleStartMatch()}
          onTogglePause={() => {
            setGameState((prev) => (prev === 'paused' ? 'playing' : 'paused'));
          }}
        />
      )}
    </main>
  );
}
