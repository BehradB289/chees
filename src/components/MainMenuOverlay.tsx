import React from 'react';
import { Color } from 'chess.js';
import { AIDifficulty, AI_DIFFICULTIES } from '../engine/chessAI.ts';
import { PieceSvgIcon, RoyalTitleCrestSvg } from './ChessIcons.tsx';

export interface MainMenuOverlayProps {
  difficulty: AIDifficulty;
  playerColor: Color;
  onSelectDifficulty: (diff: AIDifficulty) => void;
  onSelectColor: (color: Color) => void;
  onStartMatch: () => void;
}

export const MainMenuOverlay: React.FC<MainMenuOverlayProps> = ({
  difficulty,
  playerColor,
  onSelectDifficulty,
  onSelectColor,
  onStartMatch,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(8, 10, 15, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-title-heading"
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-amber-500/25 p-5 sm:p-8 shadow-2xl my-auto"
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.96)' }}
      >
        {/* Title & Custom SVG Emblem Lockup */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <RoyalTitleCrestSvg className="w-14 h-14 sm:w-16 sm:h-16 mb-3" />
          <h1
            id="game-title-heading"
            className="text-2xl sm:text-4xl font-bold tracking-wider text-amber-100"
            style={{
              fontFamily: '"Cinzel", Georgia, serif',
              textShadow: '0 2px 18px rgba(245, 158, 11, 0.35)',
              textWrap: 'balance',
            }}
          >
            Grandmaster 3D Chess
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-xl">
            Obsidian &amp; Imperial Gold Staunton Edition · Full FIDE Rules · 4-Tier Tactical AI Engine
          </p>
        </div>

        {/* 4-Tier Difficulty Selection Grid (1 col on mobile, 2x2 on tablet, 4 cols on desktop) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide">
              Select Opponent Tier
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {AI_DIFFICULTIES.find((d) => d.id === difficulty)?.elo}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {AI_DIFFICULTIES.map((tier) => {
              const isSelected = difficulty === tier.id;
              const isGod = tier.id === 'god';

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onSelectDifficulty(tier.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col justify-between text-left rounded-xl p-4 transition-all min-h-[148px] border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isGod
                      ? isSelected
                        ? 'border-red-500 bg-red-950/50 shadow-lg shadow-red-900/30'
                        : 'border-red-500/40 bg-red-950/20 hover:border-red-400/70'
                      : isSelected
                      ? 'border-amber-400 bg-amber-950/35 shadow-lg shadow-amber-900/20'
                      : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-base font-bold tracking-tight whitespace-nowrap ${
                          isGod
                            ? 'text-red-300'
                            : isSelected
                            ? 'text-amber-300'
                            : 'text-slate-100'
                        }`}
                        style={isGod ? { fontFamily: '"Cinzel", Georgia, serif' } : undefined}
                      >
                        {tier.name}
                      </span>
                      <span
                        className={`text-xs font-mono tabular-nums whitespace-nowrap ${
                          isGod ? 'text-red-400 font-semibold' : 'text-amber-400/90'
                        }`}
                      >
                        {tier.elo}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mb-2">
                      {tier.subtitle}
                      {tier.badge ? ` · ${tier.badge}` : ''}
                    </div>

                    <p className="text-xs leading-relaxed text-slate-300/90">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{tier.allowUndo ? 'Undo Allowed' : 'Zero-Mistake Lock'}</span>
                    <span
                      className={`font-semibold ${
                        isSelected
                          ? isGod
                            ? 'text-red-300'
                            : 'text-amber-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player Color Selection & Start Match Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/90">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Play As:
            </span>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onSelectColor('w')}
                aria-pressed={playerColor === 'w'}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  playerColor === 'w'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieceSvgIcon type="k" color="w" className="w-4 h-4" />
                <span>White Pieces</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectColor('b')}
                aria-pressed={playerColor === 'b'}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  playerColor === 'b'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieceSvgIcon type="k" color="b" className="w-4 h-4" />
                <span>Black Pieces</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartMatch();
            }}
            className="min-h-[48px] px-8 py-3 rounded-xl font-bold text-sm sm:text-base tracking-wide text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Match
          </button>
        </div>

        {/* Non-interactive Flat Control Hint Line */}
        <div className="mt-5 text-center text-[11px] text-slate-400">
          Tap or Click Square to Move · Drag to Orbit 3D Board · Pinch or Scroll to Zoom · Press P or Esc to Pause
        </div>
      </div>
    </div>
  );
};
