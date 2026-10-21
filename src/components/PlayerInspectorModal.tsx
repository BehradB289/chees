import React from 'react';
import { X, Shield, Award, Flame, Swords } from 'lucide-react';
import {
  type LeaderboardEntry,
  AVATAR_OPTIONS,
  getRankTierByElo,
  getDetailedRankBadge,
  calculateLevelFromXp,
} from '../progression/progression.ts';
import { PieceSvgIcon } from './ChessIcons.tsx';

export interface PlayerInspectorModalProps {
  entry: LeaderboardEntry;
  onClose: () => void;
}

export const PlayerInspectorModal: React.FC<PlayerInspectorModalProps> = ({
  entry,
  onClose,
}) => {
  const tier = getRankTierByElo(entry.elo);
  const detailedBadge = getDetailedRankBadge(entry.elo);
  const lvlInfo = calculateLevelFromXp(entry.xp);
  const avOption =
    AVATAR_OPTIONS.find((a) => a.id === entry.avatarId) || AVATAR_OPTIONS[0];

  const totalMatches = entry.wins + entry.losses + entry.draws;
  const winRate =
    totalMatches > 0 ? Math.round((entry.wins / totalMatches) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(6, 8, 13, 0.88)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-amber-500/35 p-6 shadow-2xl my-auto"
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.99)' }}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center shrink-0">
              <PieceSvgIcon
                type={avOption.pieceType}
                color={avOption.pieceColor}
                className="w-8 h-8"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="inspector-modal-title"
                  className="text-xl font-bold text-amber-100"
                  style={{ fontFamily: '"Cinzel", Georgia, serif' }}
                >
                  {entry.username}
                </h2>
                {entry.isUser && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    YOU
                  </span>
                )}
                {entry.isOnlinePeer && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    ONLINE PEER
                  </span>
                )}
                {entry.id.startsWith('ai-') && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-400/40">
                    STOCKFISH ENGINE
                  </span>
                )}
              </div>

              {/* Rank Standing + Sub-Tier Badge + Exact Numeric ELO */}
              <div className="mt-1 flex items-center gap-2 text-xs font-mono tabular-nums">
                <span className="text-amber-300 font-bold">
                  Rank #{entry.standing}
                </span>
                <span className="text-slate-500">•</span>
                <span
                  className={`px-2 py-0.5 rounded border font-sans font-semibold ${tier.borderClass} ${tier.bgClass} ${tier.textClass}`}
                >
                  {detailedBadge}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-100 font-bold">
                  {entry.elo.toLocaleString('en-US')} ELO
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Player Inspector"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-400/50 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level & Animated XP Progress Bar */}
        <div className="my-4 p-4 rounded-xl bg-slate-900/95 border border-slate-800 tabular-nums">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Level {lvlInfo.level} Competitor
            </span>
            <span className="font-mono text-slate-400">
              {entry.xp.toLocaleString('en-US')} Total XP ({lvlInfo.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${lvlInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* 6-Card Career Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center tabular-nums">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Swords className="w-3.5 h-3.5 text-slate-400" />
              TOTAL MATCHES
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 mt-1">
              {totalMatches}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30">
            <div className="text-[11px] text-emerald-300 font-semibold">
              TOTAL WINS
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
              {entry.wins}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">LOSSES / DRAWS</div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">
              {entry.losses}L · {entry.draws}D
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">WIN RATE %</div>
            <div className="text-lg font-mono font-bold text-amber-300 mt-1">
              {winRate}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              WIN STREAK
            </div>
            <div className="text-lg font-mono font-bold text-amber-200 mt-1">
              {entry.winStreak} (Best {entry.bestWinStreak})
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              NUMERIC RATING
            </div>
            <div className="text-lg font-mono font-bold text-amber-300 mt-1">
              {entry.elo.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
