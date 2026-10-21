import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, type Color, type Move } from 'chess.js';
import {
  type AIDifficulty,
  computeStockfishMoveAsync,
  ensureStockfishWorker,
  clearTranspositionTable,
  pickAIEmoteReaction,
} from './engine/chessAI.ts';
import { detectOpeningName } from './engine/openingBook.ts';
import { getCapturedAndMaterial } from './engine/evaluation.ts';
import {
  type PlayerProfile,
  type LeaderboardEntry,
  AI_TIER_ELO_MAP,
  loadPlayerProfile,
  savePlayerProfile,
  recordMatchResult,
  buildMergedLeaderboard,
  buildAIInspectorProfile,
  getPlayerStanding,
} from './progression/progression.ts';
import {
  type TimeControlId,
  TIME_CONTROLS,
  STICKER_PRESETS,
  ChessP2PManager,
} from './multiplayer/peerManager.ts';
import { ChessScene3D } from './three/ChessScene3D.tsx';
import { MainMenuOverlay } from './components/MainMenuOverlay.tsx';
import {
  GameHud,
  type MoveLogPair,
  type MatchProgressionSummary,
  type EmoteBubbleItem,
  type ChatLogEntry,
} from './components/GameHud.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';
import { ProfileSetupModal } from './components/ProfileSetupModal.tsx';
import { PlayerInspectorModal } from './components/PlayerInspectorModal.tsx';
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
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return { autostart: false, room: '' };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      autostart: params.get('autostart') === '1',
      room: params.get('room') || '',
    };
  }, []);

  const chessRef = useRef<Chess>(new Chess());
  const aiTimerRef = useRef<number | null>(null);
  const emoteTimerRef = useRef<number | null>(null);
  const p2pRef = useRef<ChessP2PManager | null>(null);
  const matchScoredRef = useRef<boolean>(false);

  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() =>
    loadPlayerProfile()
  );
  const [opponentProfile, setOpponentProfile] = useState<PlayerProfile | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [inspectedPlayer, setInspectedPlayer] = useState<LeaderboardEntry | null>(
    null
  );

  const [matchMode, setMatchMode] = useState<'ai' | 'pvp'>(
    urlParams.room ? 'pvp' : 'ai'
  );
  const [gameState, setGameState] = useState<GameState>(
    urlParams.autostart ? 'playing' : 'title'
  );
  const [difficulty, setDifficulty] = useState<AIDifficulty>('god');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControlId>('unlimited');

  const initialClockMs =
    TIME_CONTROLS.find((tc) => tc.id === timeControl)?.initialMs ?? 0;
  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(initialClockMs);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(initialClockMs);

  const [p2pStatus, setP2pStatus] = useState<
    'idle' | 'hosting' | 'joining' | 'connected' | 'disconnected' | 'error'
  >('idle');
  const [p2pStatusDetail, setP2pStatusDetail] = useState<string>('');
  const [hostedRoomCode, setHostedRoomCode] = useState<string>('');
  const [p2pPingMs, setP2pPingMs] = useState<number | null>(null);
  const [incomingDrawOffer, setIncomingDrawOffer] = useState<boolean>(false);
  const [incomingRematchRequest, setIncomingRematchRequest] = useState<boolean>(false);

  const [activeEmoteBubble, setActiveEmoteBubble] =
    useState<EmoteBubbleItem | null>(null);
  const [chatLog, setChatLog] = useState<ChatLogEntry[]>([]);

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
  const [customOutcomeOverride, setCustomOutcomeOverride] = useState<{
    title: string;
    subtitle: string;
    winner: Color | 'draw';
  } | null>(null);
  const [matchProgression, setMatchProgression] =
    useState<MatchProgressionSummary | null>(null);

  // Trigger a floating emote/chat bubble that auto-fades after 3.8 seconds
  const triggerEmoteBubble = useCallback(
    (
      sender: 'player' | 'opponent',
      senderName: string,
      emoji: string,
      text: string,
      recordInLog = true
    ) => {
      if (emoteTimerRef.current !== null) {
        window.clearTimeout(emoteTimerRef.current);
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setActiveEmoteBubble({ id, sender, senderName, emoji, text });
      if (recordInLog) {
        setChatLog((prev) => [
          ...prev.slice(-29),
          { id, sender, senderName, text, emoji },
        ]);
      }
      soundFX.playEmote();
      emoteTimerRef.current = window.setTimeout(() => {
        setActiveEmoteBubble(null);
        emoteTimerRef.current = null;
      }, 3800);
    },
    []
  );

  // Pre-warm Stockfish WebWorker in browser background
  useEffect(() => {
    ensureStockfishWorker().catch(() => {});
  }, []);

  // Mirror state machine to document.body.dataset
  useEffect(() => {
    document.body.dataset.state = gameState;
    document.body.dataset.difficulty = difficulty;
    document.body.dataset.mode = matchMode;
    document.body.dataset.timeControl = timeControl;
  }, [gameState, difficulty, matchMode, timeControl]);

  const clearPendingAITimer = useCallback(() => {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, []);

  // Finalize match outcome & award ELO + XP once per match
  const finalizeMatchOutcome = useCallback(
    (winner: Color | 'draw', overrideBanner?: { title: string; subtitle: string }) => {
      clearPendingAITimer();
      setIsAIThinking(false);
      setGameState('gameover');

      if (overrideBanner) {
        setCustomOutcomeOverride({
          title: overrideBanner.title,
          subtitle: overrideBanner.subtitle,
          winner,
        });
      }

      if (!matchScoredRef.current) {
        matchScoredRef.current = true;
        const outcome: 'win' | 'draw' | 'loss' =
          winner === 'draw'
            ? 'draw'
            : winner === playerColor
            ? 'win'
            : 'loss';

        const oppElo =
          matchMode === 'pvp' && opponentProfile
            ? opponentProfile.elo
            : AI_TIER_ELO_MAP[difficulty];

        const movesPlayed = Math.ceil(chessRef.current.history().length / 2);
        const result = recordMatchResult(
          playerProfile,
          matchMode,
          difficulty,
          oppElo,
          outcome,
          movesPlayed
        );

        setPlayerProfile(result.updatedProfile);
        p2pRef.current?.updateLocalProfile(result.updatedProfile, true);
        setMatchProgression({
          eloDelta: result.eloDelta,
          xpEarned: result.xpEarned,
          leveledUp: result.leveledUp,
          tierChanged: result.tierChanged,
        });
      }

      if (winner === 'draw') {
        soundFX.playGameOver(null);
      } else {
        soundFX.playGameOver(winner === playerColor);
      }
    },
    [
      clearPendingAITimer,
      playerColor,
      matchMode,
      opponentProfile,
      difficulty,
      playerProfile,
    ]
  );

  const syncChessState = useCallback(
    (lastMoved?: { from: string; to: string } | null) => {
      const chess = chessRef.current;
      const currentFen = chess.fen();
      const movesHistory = chess.history();

      setFen(currentFen);
      setHistorySan(movesHistory);
      if (lastMoved !== undefined) {
        setLastMove(lastMoved);
      }

      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          const winner: Color = chess.turn() === 'w' ? 'b' : 'w';
          finalizeMatchOutcome(winner);
        } else {
          finalizeMatchOutcome('draw');
        }
      }
    },
    [finalizeMatchOutcome]
  );

  // Start or restart match
  const handleStartMatch = useCallback(
    (
      overrideColor?: Color,
      overrideMode?: 'ai' | 'pvp',
      overrideTimeControl?: TimeControlId
    ) => {
      clearPendingAITimer();
      clearTranspositionTable();
      matchScoredRef.current = false;

      const activeMode = overrideMode ?? matchMode;
      const chosenColor = overrideColor ?? playerColor;
      const chosenTc = overrideTimeControl ?? timeControl;
      const clockMs =
        TIME_CONTROLS.find((t) => t.id === chosenTc)?.initialMs ?? 0;

      const freshChess = new Chess();
      chessRef.current = freshChess;
      setMatchMode(activeMode);
      setPlayerColor(chosenColor);
      setTimeControl(chosenTc);
      setWhiteTimeMs(clockMs);
      setBlackTimeMs(clockMs);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setCustomOutcomeOverride(null);
      setMatchProgression(null);
      setIncomingDrawOffer(false);
      setIncomingRematchRequest(false);
      setActiveEmoteBubble(null);
      setLastMove(null);
      setIsAIThinking(false);
      setFen(freshChess.fen());
      setHistorySan([]);
      setCameraFlipped(chosenColor === 'b');
      setCameraResetTrigger((c) => c + 1);
      setGameState('playing');
      soundFX.playMove();
    },
    [matchMode, playerColor, timeControl, clearPendingAITimer]
  );

  // Build dynamic P2P callbacks and keep ChessP2PManager updated without re-registering listeners
  const p2pCallbacks = useMemo(
    () => ({
      onStatusChange: (
        status: 'idle' | 'hosting' | 'joining' | 'connected' | 'disconnected' | 'error',
        detail?: string
      ) => {
        setP2pStatus(status);
        setP2pStatusDetail(detail || '');
      },
      onOpponentProfile: (
        oppProfile: PlayerProfile,
        assignedLocalColor: Color,
        syncedTc: TimeControlId,
        isInitialConnect: boolean
      ) => {
        setOpponentProfile(oppProfile);
        if (isInitialConnect) {
          handleStartMatch(assignedLocalColor, 'pvp', syncedTc);
        }
      },
      onRemoteMove: (payload: {
        moveId: string;
        from: string;
        to: string;
        promotion?: string;
        san: string;
        fen: string;
        whiteTimeMs: number;
        blackTimeMs: number;
      }) => {
        const chess = chessRef.current;
        try {
          const moved = chess.move({
            from: payload.from,
            to: payload.to,
            promotion: (payload.promotion as 'q' | 'r' | 'b' | 'n') || 'q',
          });
          if (moved) {
            setWhiteTimeMs(payload.whiteTimeMs);
            setBlackTimeMs(payload.blackTimeMs);
            if (chess.inCheck()) soundFX.playCheck();
            else if (moved.captured) soundFX.playCapture();
            else soundFX.playMove();
            setSelectedSquare(null);
            syncChessState({ from: moved.from, to: moved.to });
          }
        } catch {
          // ignore duplicate move packet
        }
      },
      onRemoteEmote: (payload: {
        stickerId: string;
        emoji: string;
        label: string;
        senderName: string;
      }) => {
        triggerEmoteBubble(
          'opponent',
          payload.senderName || opponentProfile?.username || 'Opponent',
          payload.emoji,
          payload.label
        );
      },
      onRemoteChat: (payload: {
        text: string;
        senderName: string;
        sentAt: number;
      }) => {
        triggerEmoteBubble(
          'opponent',
          payload.senderName || opponentProfile?.username || 'Opponent',
          '💬',
          payload.text
        );
      },
      onRemoteResign: () => {
        finalizeMatchOutcome(playerColor, {
          title: 'Victory by Resignation',
          subtitle: `${
            opponentProfile?.username || 'Your opponent'
          } resigned the match.`,
        });
      },
      onDrawOfferReceived: () => {
        setIncomingDrawOffer(true);
        soundFX.playSelect();
      },
      onDrawAccepted: () => {
        setIncomingDrawOffer(false);
        finalizeMatchOutcome('draw', {
          title: 'Draw by Mutual Agreement',
          subtitle: 'Both players agreed to a draw.',
        });
      },
      onDrawDeclined: () => {
        setIncomingDrawOffer(false);
      },
      onRematchRequested: () => {
        setIncomingRematchRequest(true);
        soundFX.playSelect();
      },
      onRematchAccepted: (newLocalColor: Color, syncedTc: TimeControlId) => {
        handleStartMatch(newLocalColor, 'pvp', syncedTc);
      },
      onPingUpdated: (pingMs: number) => {
        setP2pPingMs(pingMs);
      },
    }),
    [
      handleStartMatch,
      syncChessState,
      triggerEmoteBubble,
      opponentProfile,
      finalizeMatchOutcome,
      playerColor,
    ]
  );

  // Keep P2P callbacks fresh without re-binding WebRTC connection listeners
  useEffect(() => {
    p2pRef.current?.updateCallbacks(p2pCallbacks);
  }, [p2pCallbacks]);

  // Initialize PeerJS P2P Manager strictly ONCE on mount
  useEffect(() => {
    const manager = new ChessP2PManager(playerProfile, p2pCallbacks);
    p2pRef.current = manager;

    // Auto-join room if URL contains ?room=CHESS-XXXXX
    if (urlParams.room) {
      const normalized = manager.joinRoom(urlParams.room);
      setHostedRoomCode(normalized);
    }

    return () => {
      manager.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live Chess Clock Countdown Timer (Disabled when timeControl === 'unlimited')
  useEffect(() => {
    if (gameState !== 'playing' || timeControl === 'unlimited') return;

    const interval = window.setInterval(() => {
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTimeMs((prev) => {
          if (prev <= 200) {
            window.clearInterval(interval);
            finalizeMatchOutcome('b', {
              title: playerColor === 'b' ? 'Victory on Time' : 'Defeat on Time',
              subtitle: 'White clock expired (Flagged). Black wins on time.',
            });
            return 0;
          }
          return prev - 200;
        });
      } else {
        setBlackTimeMs((prev) => {
          if (prev <= 200) {
            window.clearInterval(interval);
            finalizeMatchOutcome('w', {
              title: playerColor === 'w' ? 'Victory on Time' : 'Defeat on Time',
              subtitle: 'Black clock expired (Flagged). White wins on time.',
            });
            return 0;
          }
          return prev - 200;
        });
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [gameState, timeControl, playerColor, finalizeMatchOutcome]);

  // Trigger Stockfish UCI Engine move when it is AI's turn in 'ai' mode
  useEffect(() => {
    clearPendingAITimer();
    const chess = chessRef.current;

    if (matchMode !== 'ai' || gameState !== 'playing' || chess.isGameOver()) {
      setIsAIThinking(false);
      return;
    }

    const currentTurn = chess.turn();
    if (currentTurn !== playerColor) {
      setIsAIThinking(true);
      const delayMs = difficulty === 'easy' ? 220 : 180;

      aiTimerRef.current = window.setTimeout(async () => {
        const currentChess = chessRef.current;
        if (
          matchMode !== 'ai' ||
          currentChess.isGameOver() ||
          currentChess.turn() === playerColor
        ) {
          setIsAIThinking(false);
          return;
        }

        const targetFen = currentChess.fen();
        const aiResult = await computeStockfishMoveAsync(targetFen, difficulty);

        if (
          chessRef.current.fen() !== targetFen ||
          chessRef.current.isGameOver()
        ) {
          setIsAIThinking(false);
          return;
        }

        if (aiResult) {
          const executed = currentChess.move({
            from: aiResult.from,
            to: aiResult.to,
            promotion: aiResult.promotion || 'q',
          });

          if (executed) {
            const isCheckmate = currentChess.isCheckmate();
            const isCheck = currentChess.inCheck();

            if (isCheck) {
              soundFX.playCheck();
            } else if (executed.captured) {
              soundFX.playCapture();
            } else if (
              executed.flags.includes('k') ||
              executed.flags.includes('q')
            ) {
              soundFX.playCastle();
            } else {
              soundFX.playMove();
            }

            setIsAIThinking(false);
            setSelectedSquare(null);
            syncChessState({ from: executed.from, to: executed.to });

            // Singleplayer AI contextual emote reaction
            const aiName = `Stockfish · ${difficulty.toUpperCase()}`;
            if (isCheckmate) {
              const react = pickAIEmoteReaction(difficulty, 'ai_checkmate');
              if (react) {
                triggerEmoteBubble('opponent', aiName, react.emoji, react.text);
              }
            } else if (isCheck) {
              const react = pickAIEmoteReaction(difficulty, 'ai_check');
              if (react) {
                triggerEmoteBubble('opponent', aiName, react.emoji, react.text);
              }
            } else if (executed.captured) {
              const react = pickAIEmoteReaction(
                difficulty,
                'ai_captured_player'
              );
              if (react) {
                triggerEmoteBubble('opponent', aiName, react.emoji, react.text);
              }
            }
            return;
          }
        }
        setIsAIThinking(false);
      }, delayMs);
    } else {
      setIsAIThinking(false);
    }

    return () => clearPendingAITimer();
  }, [
    fen,
    matchMode,
    gameState,
    playerColor,
    difficulty,
    clearPendingAITimer,
    syncChessState,
    triggerEmoteBubble,
  ]);

  // Execute a verified player move (and broadcast over WebRTC if in P2P mode)
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

        // Singleplayer AI reaction when player captures an AI piece
        if (matchMode === 'ai' && moveObj.captured && !chess.isGameOver()) {
          const react = pickAIEmoteReaction(difficulty, 'player_captured_ai');
          if (react) {
            triggerEmoteBubble(
              'opponent',
              `Stockfish · ${difficulty.toUpperCase()}`,
              react.emoji,
              react.text
            );
          }
        }

        if (matchMode === 'pvp' && p2pRef.current) {
          p2pRef.current.send({
            type: 'move',
            moveId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            from: moveObj.from,
            to: moveObj.to,
            promotion: moveObj.promotion,
            san: moveObj.san,
            fen: chess.fen(),
            whiteTimeMs,
            blackTimeMs,
          });
        }
        return true;
      } catch {
        return false;
      }
    },
    [
      syncChessState,
      matchMode,
      difficulty,
      triggerEmoteBubble,
      whiteTimeMs,
      blackTimeMs,
    ]
  );

  // Send a Quick Sticker Emote
  const handleSendSticker = useCallback(
    (stickerId: string) => {
      const preset =
        STICKER_PRESETS.find((s) => s.id === stickerId) || STICKER_PRESETS[0];
      triggerEmoteBubble(
        'player',
        playerProfile.username,
        preset.emoji,
        preset.label
      );

      if (matchMode === 'pvp' && p2pRef.current) {
        p2pRef.current.send({
          type: 'emote',
          stickerId: preset.id,
          emoji: preset.emoji,
          label: preset.label,
          senderName: playerProfile.username,
        });
      }
    },
    [playerProfile.username, matchMode, triggerEmoteBubble]
  );

  // Send a Custom Chat Message
  const handleSendChatMessage = useCallback(
    (text: string) => {
      const cleaned = text.trim().slice(0, 120);
      if (!cleaned) return;
      triggerEmoteBubble('player', playerProfile.username, '💬', cleaned);

      if (matchMode === 'pvp' && p2pRef.current) {
        p2pRef.current.send({
          type: 'chat',
          text: cleaned,
          senderName: playerProfile.username,
          sentAt: Date.now(),
        });
      }
    },
    [playerProfile.username, matchMode, triggerEmoteBubble]
  );

  // Inspect self profile card
  const handleInspectSelf = useCallback(() => {
    const merged = buildMergedLeaderboard(playerProfile);
    const selfEntry = merged.find((e) => e.id === playerProfile.id);
    if (selfEntry) {
      setInspectedPlayer(selfEntry);
      soundFX.playSelect();
    }
  }, [playerProfile]);

  // Inspect active opponent (Online Peer or Stockfish Engine)
  const handleInspectOpponent = useCallback(() => {
    if (matchMode === 'pvp' && opponentProfile) {
      const standing = getPlayerStanding(playerProfile, opponentProfile.id);
      setInspectedPlayer({
        id: opponentProfile.id,
        username: opponentProfile.username,
        avatarId: opponentProfile.avatarId,
        elo: opponentProfile.elo,
        level: opponentProfile.level,
        xp: opponentProfile.xp,
        wins: opponentProfile.wins,
        losses: opponentProfile.losses,
        draws: opponentProfile.draws,
        winStreak: opponentProfile.winStreak,
        bestWinStreak: opponentProfile.bestWinStreak,
        standing,
        isOnlinePeer: true,
      });
    } else {
      setInspectedPlayer(buildAIInspectorProfile(difficulty));
    }
    soundFX.playSelect();
  }, [matchMode, opponentProfile, playerProfile, difficulty]);

  // Handle clicking/tapping any 3D board square (Strictly locked to player's own turn & pieces)
  const handleSquareClick = useCallback(
    (square: string) => {
      if (gameState !== 'playing' || isAIThinking || pendingPromotion) return;

      const chess = chessRef.current;
      if (chess.turn() !== playerColor) return;

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
        const candidate = chess
          .moves({ verbose: true })
          .find((m) => m.san === san);
        if (candidate) {
          executePlayerMove(
            candidate.from,
            candidate.to,
            candidate.promotion as 'q' | 'r' | 'b' | 'n' | undefined
          );
        }
      } catch {
        // ignore invalid SAN
      }
    },
    [gameState, isAIThinking, playerColor, executePlayerMove]
  );

  // Expose square click helper on window for programmatic verification
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chessSelectSquare =
      handleSquareClick;
    return () => {
      delete (window as unknown as Record<string, unknown>).__chessSelectSquare;
    };
  }, [handleSquareClick]);

  // Undo Move (strictly disabled in GOD MODE and Online P2P)
  const handleUndoMove = useCallback(() => {
    if (
      matchMode === 'pvp' ||
      difficulty === 'god' ||
      isAIThinking ||
      gameState !== 'playing'
    ) {
      return;
    }
    const chess = chessRef.current;
    const historyLen = chess.history().length;
    if (historyLen === 0) return;

    clearPendingAITimer();
    chess.undo();
    if (chess.turn() !== playerColor && chess.history().length > 0) {
      chess.undo();
    }

    setSelectedSquare(null);
    setPendingPromotion(null);
    const verboseHist = chess.history({ verbose: true });
    const prevMove =
      verboseHist.length > 0 ? verboseHist[verboseHist.length - 1] : null;
    syncChessState(prevMove ? { from: prevMove.from, to: prevMove.to } : null);
    soundFX.playSelect();
  }, [
    matchMode,
    difficulty,
    isAIThinking,
    gameState,
    playerColor,
    clearPendingAITimer,
    syncChessState,
  ]);

  // Global keyboard shortcuts (Enter/Space on Title, P/Esc for Pause, M for Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (inspectedPlayer || showLeaderboard || showProfileModal) {
        if (e.code === 'Escape') {
          if (inspectedPlayer) setInspectedPlayer(null);
          else if (showLeaderboard) setShowLeaderboard(false);
          else if (showProfileModal) setShowProfileModal(false);
        }
        return;
      }

      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartMatch(playerColor, 'ai', timeControl);
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
  }, [
    gameState,
    pendingPromotion,
    inspectedPlayer,
    showLeaderboard,
    showProfileModal,
    playerColor,
    timeControl,
    handleStartMatch,
  ]);

  // Compute derived board readouts
  const currentChess = useMemo(() => new Chess(fen), [fen]);
  const turn = currentChess.turn();
  const inCheck = currentChess.inCheck();
  const inCheckKingSquare = useMemo(
    () => findCheckedKingSquare(currentChess),
    [currentChess]
  );

  const selectedSquareMoves: Move[] = useMemo(() => {
    if (!selectedSquare || gameState !== 'playing') return [];
    try {
      return currentChess.moves({
        square: selectedSquare as any,
        verbose: true,
      });
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
  const openingName = useMemo(
    () => detectOpeningName(historySan),
    [historySan]
  );

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
    matchMode === 'ai' &&
    difficulty !== 'god' &&
    gameState === 'playing' &&
    !isAIThinking &&
    historySan.length > 0 &&
    !(playerColor === 'b' && historySan.length < 2);

  const gameOverInfo = useMemo(() => {
    if (customOutcomeOverride) {
      return customOutcomeOverride;
    }
    if (!currentChess.isGameOver()) return null;
    if (currentChess.isCheckmate()) {
      const winner: Color = currentChess.turn() === 'w' ? 'b' : 'w';
      const playerWon = winner === playerColor;
      const oppLabel =
        matchMode === 'pvp'
          ? opponentProfile?.username || 'Online Opponent'
          : `Stockfish ${difficulty.toUpperCase()}`;
      return {
        title: playerWon ? 'Victory by Checkmate' : 'Defeat by Checkmate',
        subtitle: playerWon
          ? `You checkmated ${oppLabel} in ${movePairs.length} moves.`
          : `${oppLabel} delivered checkmate (${
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
  }, [
    customOutcomeOverride,
    currentChess,
    playerColor,
    matchMode,
    opponentProfile,
    difficulty,
    movePairs.length,
  ]);

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
          profile={playerProfile}
          matchMode={matchMode}
          difficulty={difficulty}
          playerColor={playerColor}
          timeControl={timeControl}
          p2pStatus={p2pStatus}
          p2pStatusDetail={p2pStatusDetail}
          hostedRoomCode={hostedRoomCode}
          onSelectMatchMode={(m) => {
            setMatchMode(m);
            soundFX.playSelect();
          }}
          onSelectDifficulty={(diff) => {
            setDifficulty(diff);
            soundFX.playSelect();
          }}
          onSelectColor={(col) => {
            setPlayerColor(col);
            soundFX.playSelect();
          }}
          onSelectTimeControl={(tc) => {
            setTimeControl(tc);
            soundFX.playSelect();
          }}
          onStartMatch={() => handleStartMatch(playerColor, 'ai', timeControl)}
          onCreateOnlineRoom={() => {
            if (!p2pRef.current) return;
            const code = p2pRef.current.createRoom(playerColor, timeControl);
            setHostedRoomCode(code);
            soundFX.playSelect();
          }}
          onJoinOnlineRoom={(code) => {
            if (!p2pRef.current) return;
            const norm = p2pRef.current.joinRoom(code);
            setHostedRoomCode(norm);
            soundFX.playSelect();
          }}
          onCancelOnlineRoom={() => {
            p2pRef.current?.disconnect();
            setP2pStatus('idle');
            setP2pStatusDetail('');
            setHostedRoomCode('');
          }}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenProfileModal={() => setShowProfileModal(true)}
          onInspectSelf={handleInspectSelf}
        />
      )}

      {/* Active In-Game HUD & Status Overlays */}
      {gameState !== 'title' && (
        <GameHud
          gameState={gameState}
          matchMode={matchMode}
          difficulty={difficulty}
          timeControl={timeControl}
          playerColor={playerColor}
          playerProfile={playerProfile}
          opponentProfile={opponentProfile}
          p2pRoomCode={hostedRoomCode}
          p2pPingMs={p2pPingMs}
          p2pConnected={p2pStatus === 'connected'}
          incomingDrawOffer={incomingDrawOffer}
          incomingRematchRequest={incomingRematchRequest}
          whiteTimeMs={whiteTimeMs}
          blackTimeMs={blackTimeMs}
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
          activeEmoteBubble={activeEmoteBubble}
          chatLog={chatLog}
          gameOverInfo={gameOverInfo}
          matchProgression={matchProgression}
          pendingPromotion={pendingPromotion}
          onSelectPromotion={(piece) => {
            if (pendingPromotion) {
              executePlayerMove(
                pendingPromotion.from,
                pendingPromotion.to,
                piece
              );
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
          onQuickRematch={() => {
            if (matchMode === 'pvp' && p2pRef.current) {
              if (incomingRematchRequest) {
                const swappedColor: Color = playerColor === 'w' ? 'b' : 'w';
                p2pRef.current.send({
                  type: 'rematch_accept',
                  newHostColor: swappedColor,
                  timeControl,
                });
                handleStartMatch(swappedColor, 'pvp', timeControl);
              } else {
                p2pRef.current.send({ type: 'rematch_request' });
                soundFX.playSelect();
              }
            } else {
              handleStartMatch(playerColor, 'ai', timeControl);
            }
          }}
          onTogglePause={() => {
            setGameState((prev) => (prev === 'paused' ? 'playing' : 'paused'));
          }}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onInspectOpponent={handleInspectOpponent}
          onSendSticker={handleSendSticker}
          onSendChatMessage={handleSendChatMessage}
          onResignMatch={() => {
            if (gameState === 'gameover') return;
            if (matchMode === 'pvp') {
              p2pRef.current?.send({ type: 'resign' });
            }
            const winner: Color = playerColor === 'w' ? 'b' : 'w';
            finalizeMatchOutcome(winner, {
              title: 'Defeat by Resignation',
              subtitle: 'You resigned the match.',
            });
          }}
          onOfferDraw={() => {
            if (matchMode === 'pvp') {
              p2pRef.current?.send({ type: 'draw_offer' });
              soundFX.playSelect();
            }
          }}
          onAcceptDraw={() => {
            setIncomingDrawOffer(false);
            p2pRef.current?.send({ type: 'draw_accept' });
            finalizeMatchOutcome('draw', {
              title: 'Draw by Mutual Agreement',
              subtitle: 'Both players agreed to a draw.',
            });
          }}
          onDeclineDraw={() => {
            setIncomingDrawOffer(false);
            p2pRef.current?.send({ type: 'draw_decline' });
          }}
        />
      )}

      {/* Real-Players-Only Tiered Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          userProfile={playerProfile}
          onInspectPlayer={(entry) => {
            setInspectedPlayer(entry);
            soundFX.playSelect();
          }}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Clickable Player / Opponent Inspector Modal */}
      {inspectedPlayer && (
        <PlayerInspectorModal
          entry={inspectedPlayer}
          onClose={() => setInspectedPlayer(null)}
        />
      )}

      {/* Competitor Profile Customization Modal */}
      {showProfileModal && (
        <ProfileSetupModal
          profile={playerProfile}
          onSave={(newUsername, newAvatarId) => {
            const updated = savePlayerProfile({
              ...playerProfile,
              username: newUsername,
              avatarId: newAvatarId,
              isConfigured: true,
            });
            setPlayerProfile(updated);
            p2pRef.current?.updateLocalProfile(updated, true);
            setShowProfileModal(false);
            soundFX.playSelect();
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </main>
  );
}
