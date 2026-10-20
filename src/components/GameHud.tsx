import React, { useState } from 'react';
import { Color, Move, PieceSymbol } from 'chess.js';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  RefreshCw,
  Compass,
  PlusCircle,
  ChevronUp,
  ChevronDown,
  Pause,
  Play,
  ListOrdered,
} from 'lucide-react';
import { AIDifficulty, AI_DIFFICULTIES } from '../engine/chessAI.ts';
import { CapturedAndMaterialInfo } from '../engine/evaluation.ts';
import { PieceSvgIcon } from './ChessIcons.tsx';

export interface MoveLogPair {
  moveNumber: number;
  white?: string;
  black?: string;
}

export interface GameHudProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  difficulty: AIDifficulty;
  playerColor: Color;
  turn: Color;
  inCheck: boolean;
  isAIThinking: boolean;
  openingName: string;
  selectedSquare: string | null;
  selectedSquareMoves: Move[];
  allTurnMoves: Move[];
  capturedInfo: CapturedAndMaterialInfo;
  movePairs: MoveLogPair[];
  totalHalfMoves: number;
  canUndo: boolean;
  soundEnabled: boolean;
  gameOverInfo: {
    title: string;
    subtitle: string;
    winner: Color | 'draw' | null;
  } | null;
  pendingPromotion: { from: string; to: string; color: Color } | null;
  onSelectPromotion: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancelPromotion: () => void;
  onExecuteSanMove: (san: string) => void;
  onUndoMove: () => void;
  onFlipCamera: () => void;
  onResetCamera: () => void;
  onToggleSound: () => void;
  onOpenNewGameMenu: () => void;
  onQuickRematch: () => void;
  onTogglePause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  gameState,
  difficulty,
  playerColor,
  turn,
  inCheck,
  isAIThinking,
  openingName,
  selectedSquare,
  selectedSquareMoves,
  allTurnMoves,
  capturedInfo,
  movePairs,
  totalHalfMoves,
  canUndo,
  soundEnabled,
  gameOverInfo,
  pendingPromotion,
  onSelectPromotion,
  onCancelPromotion,
  onExecuteSanMove,
  onUndoMove,
  onFlipCamera,
  onResetCamera,
  onToggleSound,
  onOpenNewGameMenu,
  onQuickRematch,
  onTogglePause,
}) => {
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tierMeta = AI_DIFFICULTIES.find((d) => d.id === difficulty) || AI_DIFFICULTIES[1];
  const isGod = difficulty === 'god';
  const isPlayerTurn = turn === playerColor && gameState === 'playing' && !isAIThinking;

  // Format advantage text
  const whiteAdv = capturedInfo.advantage > 0 ? `+${capturedInfo.advantage}` : '';
  const blackAdv = capturedInfo.advantage < 0 ? `+${Math.abs(capturedInfo.advantage)}` : '';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between">
      {/* TOP STATUS BAR: Compact, single-elevation dark obsidian strip */}
      <div className="w-full px-3 pt-2.5 sm:px-5 sm:pt-3.5 flex items-start justify-between gap-3">
        {/* Left/Center Status & Opponent Readout */}
        <div
          className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 py-2 rounded-xl border border-slate-800/90 shadow-xl max-w-full"
          style={{ backgroundColor: 'rgba(11, 14, 22, 0.92)' }}
        >
          {/* Opponent Tier */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap ${
                isGod ? 'text-red-300' : 'text-amber-300'
              }`}
              style={isGod ? { fontFamily: '"Cinzel", Georgia, serif' } : undefined}
            >
              {tierMeta.name}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
              {tierMeta.elo}
            </span>
          </div>

          <span className="hidden sm:inline text-slate-700" aria-hidden="true">
            |
          </span>

          {/* Live Turn & Check Status Indicator */}
          <div
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap"
            data-testid="turn-status-banner"
          >
            <PieceSvgIcon type="k" color={turn} className="w-4 h-4 shrink-0" />
            <span className="text-slate-100">
              {isAIThinking
                ? 'AI Thinking...'
                : turn === 'w'
                ? 'White to Move'
                : 'Black to Move'}
            </span>
            {inCheck && (
              <span className="text-red-400 font-bold tracking-wide ml-1">
                · CHECK!
              </span>
            )}
          </div>

          {/* Captured Pieces & Material Advantage Summary */}
          <span className="hidden md:inline text-slate-700" aria-hidden="true">
            |
          </span>
          <div
            className="hidden md:flex items-center gap-3 text-xs tabular-nums"
            data-testid="material-summary"
          >
            <div className="flex items-center gap-1" title="Captured by White">
              <span className="text-slate-400">W:</span>
              <div className="flex items-center -space-x-1">
                {capturedInfo.capturedByWhite.length === 0 ? (
                  <span className="text-slate-600">—</span>
                ) : (
                  capturedInfo.capturedByWhite.slice(0, 8).map((p, i) => (
                    <PieceSvgIcon key={i} type={p} color="b" className="w-3.5 h-3.5" />
                  ))
                )}
              </div>
              {whiteAdv && (
                <span className="text-emerald-400 font-mono font-semibold ml-1">
                  {whiteAdv}
                </span>
              )}
            </div>

            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>

            <div className="flex items-center gap-1" title="Captured by Black">
              <span className="text-slate-400">B:</span>
              <div className="flex items-center -space-x-1">
                {capturedInfo.capturedByBlack.length === 0 ? (
                  <span className="text-slate-600">—</span>
                ) : (
                  capturedInfo.capturedByBlack.slice(0, 8).map((p, i) => (
                    <PieceSvgIcon key={i} type={p} color="w" className="w-3.5 h-3.5" />
                  ))
                )}
              </div>
              {blackAdv && (
                <span className="text-amber-400 font-mono font-semibold ml-1">
                  {blackAdv}
                </span>
              )}
            </div>
          </div>

          {/* Opening Name */}
          <span className="hidden lg:inline text-slate-700" aria-hidden="true">
            |
          </span>
          <span className="hidden lg:inline text-xs text-slate-400 truncate max-w-[220px]">
            {openingName}
          </span>
        </div>

        {/* Top-Right Utility Controls (Mute [M], Pause [P]) */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={soundEnabled ? 'Mute Sound Effects' : 'Unmute Sound Effects'}
            title={soundEnabled ? 'Mute Audio [M]' : 'Unmute Audio [M]'}
            className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-800/90 flex items-center justify-center text-slate-300 hover:text-amber-300 hover:border-slate-700 transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(11, 14, 22, 0.92)' }}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            aria-label={gameState === 'paused' ? 'Resume Match' : 'Pause Match'}
            title="Pause Match [P / Esc]"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-800/90 flex items-center justify-center text-slate-300 hover:text-amber-300 hover:border-slate-700 transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(11, 14, 22, 0.92)' }}
          >
            {gameState === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* BOTTOM UNIFIED CONTROL DOCK & COLLAPSIBLE DRAWER */}
      <div className="w-full flex flex-col items-center px-2.5 pb-2.5 sm:px-4 sm:pb-4">
        <div className="w-full max-w-4xl pointer-events-auto flex flex-col items-center">
          {/* Collapse / Expand HUD Toggle Tab */}
          <div className="flex items-center gap-2 mb-1.5">
            <button
              type="button"
              onClick={() => setHudCollapsed((prev) => !prev)}
              aria-expanded={!hudCollapsed}
              className="px-3 py-1 rounded-lg border border-slate-800/90 text-[11px] font-medium text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={{ backgroundColor: 'rgba(11, 14, 22, 0.92)' }}
            >
              {hudCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide Controls</span>
                </>
              )}
            </button>
          </div>

          {!hudCollapsed && (
            <div
              className="w-full rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden"
              style={{ backgroundColor: 'rgba(11, 14, 22, 0.95)' }}
            >
              {/* Collapsible Move History, Captured Tray & Quick Tactical Move Selector Drawer */}
              {drawerOpen && (
                <div className="p-3.5 sm:p-4 border-b border-slate-800/90 max-h-[42vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column: Captured Pieces & Material Balance + Tactical Move Bar */}
                    <div className="flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-semibold text-slate-200">
                            Captured Pieces &amp; Material
                          </span>
                          <span className="font-mono tabular-nums text-amber-300">
                            {capturedInfo.advantage === 0
                              ? 'Equal Material (0)'
                              : capturedInfo.advantage > 0
                              ? `White +${capturedInfo.advantage}`
                              : `Black +${Math.abs(capturedInfo.advantage)}`}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 text-xs">
                          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80">
                            <span className="text-slate-400 whitespace-nowrap mr-2">
                              Captured by White:
                            </span>
                            <div className="flex items-center flex-wrap gap-0.5">
                              {capturedInfo.capturedByWhite.length === 0 ? (
                                <span className="text-slate-600">None</span>
                              ) : (
                                capturedInfo.capturedByWhite.map((p, idx) => (
                                  <PieceSvgIcon key={idx} type={p} color="b" className="w-4 h-4" />
                                ))
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80">
                            <span className="text-slate-400 whitespace-nowrap mr-2">
                              Captured by Black:
                            </span>
                            <div className="flex items-center flex-wrap gap-0.5">
                              {capturedInfo.capturedByBlack.length === 0 ? (
                                <span className="text-slate-600">None</span>
                              ) : (
                                capturedInfo.capturedByBlack.map((p, idx) => (
                                  <PieceSvgIcon key={idx} type={p} color="w" className="w-4 h-4" />
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Accessible Legal Move Trigger Bar */}
                      {isPlayerTurn && (
                        <div>
                          <div className="text-xs font-semibold text-slate-300 mb-1.5">
                            {selectedSquare
                              ? `Legal Moves from ${selectedSquare.toUpperCase()}:`
                              : 'Quick Algebraic Move Command:'}
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {(selectedSquare ? selectedSquareMoves : allTurnMoves.slice(0, 12)).map(
                              (m) => (
                                <button
                                  key={m.san}
                                  type="button"
                                  onClick={() => onExecuteSanMove(m.san)}
                                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-800/90 hover:border-amber-400 hover:text-amber-200 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                                >
                                  {m.san}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Algebraic Move History Log */}
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-slate-200">
                          Algebraic Move History
                        </span>
                        <span className="font-mono tabular-nums">
                          {movePairs.length} {movePairs.length === 1 ? 'Turn' : 'Turns'}
                        </span>
                      </div>

                      <div
                        className="rounded-lg bg-slate-900/90 border border-slate-800/80 p-2.5 h-32 overflow-y-auto font-mono text-xs tabular-nums"
                        data-testid="move-history-log"
                      >
                        {movePairs.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-500">
                            No moves recorded yet. Make the opening move on the 3D board.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-1">
                            {movePairs.map((pair) => (
                              <div
                                key={pair.moveNumber}
                                className="grid grid-cols-7 items-center py-0.5 px-1.5 rounded hover:bg-slate-800/60"
                              >
                                <span className="col-span-1 text-slate-500">
                                  {pair.moveNumber}.
                                </span>
                                <span className="col-span-3 text-slate-100 font-medium">
                                  {pair.white || ''}
                                </span>
                                <span className="col-span-3 text-amber-300/90 font-medium">
                                  {pair.black || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Control Bar (All 5 controls visible on 390px mobile & desktop without horizontal scroll) */}
              <div className="px-2 py-2 sm:px-4 sm:py-2.5 grid grid-cols-5 sm:flex sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                <div className="contents sm:flex sm:items-center sm:gap-2">
                  {/* New Game */}
                  <button
                    type="button"
                    onClick={onOpenNewGameMenu}
                    aria-label="New Game"
                    className="min-h-[44px] px-1.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-400/60 hover:text-amber-200 text-[11px] sm:text-xs font-semibold text-slate-200 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">New Game</span>
                    <span className="sm:hidden">New</span>
                  </button>

                  {/* Undo Move (Strictly Disabled in God Mode) */}
                  <button
                    type="button"
                    onClick={onUndoMove}
                    disabled={!canUndo}
                    aria-label={isGod ? 'Undo Locked in God Mode' : 'Undo Move'}
                    title={
                      isGod
                        ? 'Undo is strictly locked in GOD MODE'
                        : 'Undo last full turn'
                    }
                    className={`min-h-[44px] px-1.5 sm:px-3.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      canUndo
                        ? 'border-slate-800 bg-slate-900 hover:border-amber-400/60 hover:text-amber-200 text-slate-200 cursor-pointer'
                        : 'border-slate-800/40 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{isGod ? 'Undo Locked' : 'Undo Move'}</span>
                    <span className="sm:hidden">{isGod ? 'Locked' : 'Undo'}</span>
                  </button>

                  {/* Flip Camera */}
                  <button
                    type="button"
                    onClick={onFlipCamera}
                    aria-label="Flip Camera"
                    className="min-h-[44px] px-1.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-400/60 hover:text-amber-200 text-[11px] sm:text-xs font-semibold text-slate-200 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="hidden sm:inline">Flip Camera</span>
                    <span className="sm:hidden">Flip</span>
                  </button>

                  {/* Reset View */}
                  <button
                    type="button"
                    onClick={onResetCamera}
                    aria-label="Reset View"
                    className="min-h-[44px] px-1.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-400/60 hover:text-amber-200 text-[11px] sm:text-xs font-semibold text-slate-200 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="hidden sm:inline">Reset View</span>
                    <span className="sm:hidden">Reset</span>
                  </button>
                </div>

                {/* Toggle History & Captures Drawer */}
                <button
                  type="button"
                  onClick={() => setDrawerOpen((prev) => !prev)}
                  aria-expanded={drawerOpen}
                  aria-label={`Moves and Captures (${totalHalfMoves} moves)`}
                  className={`min-h-[44px] px-1.5 sm:px-3.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    drawerOpen
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Moves ({totalHalfMoves})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PAWN PROMOTION TOUCH-FRIENDLY MODAL */}
      {pendingPromotion && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(8, 10, 16, 0.82)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promotion-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-400/40 p-6 shadow-2xl text-center"
            style={{ backgroundColor: 'rgba(14, 18, 28, 0.98)' }}
          >
            <h2
              id="promotion-modal-title"
              className="text-lg sm:text-xl font-bold text-amber-200 mb-1"
              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
            >
              Promote Pawn
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Choose the piece to promote your pawn on {pendingPromotion.to.toUpperCase()}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {(
                [
                  { id: 'q', label: 'Queen' },
                  { id: 'r', label: 'Rook' },
                  { id: 'b', label: 'Bishop' },
                  { id: 'n', label: 'Knight' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPromotion(item.id)}
                  className="min-h-[84px] p-3 rounded-xl border border-slate-700 bg-slate-900 hover:border-amber-400 hover:bg-amber-500/15 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <PieceSvgIcon
                    type={item.id as PieceSymbol}
                    color={pendingPromotion.color}
                    className="w-8 h-8"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onCancelPromotion}
              className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel Move
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(8, 10, 16, 0.82)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-500/30 p-6 shadow-2xl text-center"
            style={{ backgroundColor: 'rgba(13, 17, 26, 0.98)' }}
          >
            <h2
              id="pause-modal-title"
              className="text-2xl font-bold text-amber-200 mb-1"
              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
            >
              Match Paused
            </h2>
            <p className="text-xs text-slate-400 mb-5">{openingName}</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400">MOVES</div>
                <div className="text-lg font-bold text-slate-100 tabular-nums mt-0.5">
                  {movePairs.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400">MATERIAL</div>
                <div className="text-lg font-bold text-amber-300 tabular-nums mt-0.5">
                  {capturedInfo.advantage > 0
                    ? `+${capturedInfo.advantage}`
                    : capturedInfo.advantage}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400">ENGINE</div>
                <div className="text-sm font-bold text-slate-200 mt-1 truncate">
                  {tierMeta.name}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="min-h-[46px] w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Resume Match
              </button>
              <button
                type="button"
                onClick={onQuickRematch}
                className="min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 hover:border-amber-400/60 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Restart Match
              </button>
              <button
                type="button"
                onClick={onOpenNewGameMenu}
                className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Main Menu &amp; Difficulty Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY / DEFEAT MODAL */}
      {gameState === 'gameover' && gameOverInfo && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(8, 10, 16, 0.85)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-500/40 p-6 sm:p-7 shadow-2xl text-center"
            style={{ backgroundColor: 'rgba(13, 17, 26, 0.98)' }}
          >
            <h2
              id="gameover-modal-title"
              className="text-2xl sm:text-3xl font-bold text-amber-200 mb-1.5"
              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
            >
              {gameOverInfo.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-5">
              {gameOverInfo.subtitle}
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400">TURNS</div>
                <div className="text-lg font-bold text-slate-100 tabular-nums mt-0.5">
                  {movePairs.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400">BALANCE</div>
                <div className="text-lg font-bold text-amber-300 tabular-nums mt-0.5">
                  {capturedInfo.advantage > 0
                    ? `+${capturedInfo.advantage}`
                    : capturedInfo.advantage}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[11px] text-slate-400">TIER</div>
                <div className="text-sm font-bold text-slate-200 mt-1 truncate">
                  {tierMeta.name}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={onQuickRematch}
                className="min-h-[46px] flex-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onOpenNewGameMenu}
                className="min-h-[46px] flex-1 rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-600 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                Change Difficulty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
