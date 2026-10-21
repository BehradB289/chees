import React, { useState, useMemo } from 'react';
import { X, Trophy, ArrowUpDown, Users, Eye } from 'lucide-react';
import {
  type PlayerProfile,
  type LeaderboardEntry,
  type RankTierId,
  RANK_TIERS,
  AVATAR_OPTIONS,
  getRankTierByElo,
  getDetailedRankBadge,
  buildMergedLeaderboard,
} from '../progression/progression.ts';
import { PieceSvgIcon } from './ChessIcons.tsx';

export interface LeaderboardModalProps {
  userProfile: PlayerProfile;
  onInspectPlayer: (entry: LeaderboardEntry) => void;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  userProfile,
  onInspectPlayer,
  onClose,
}) => {
  const [selectedTier, setSelectedTier] = useState<RankTierId | 'all'>('all');
  const [sortBy, setSortBy] = useState<'elo' | 'level' | 'wins'>('elo');

  const entries = useMemo(() => {
    const merged = buildMergedLeaderboard(userProfile);
    const filtered =
      selectedTier === 'all'
        ? merged
        : merged.filter((e) => getRankTierByElo(e.elo).id === selectedTier);

    return [...filtered].sort((a, b) => {
      if (sortBy === 'elo') return b.elo - a.elo || b.wins - a.wins;
      if (sortBy === 'wins') return b.wins - a.wins || b.elo - a.elo;
      return b.level - a.level || b.xp - a.xp;
    });
  }, [userProfile, selectedTier, sortBy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: 'rgba(6, 8, 13, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-amber-500/30 p-5 sm:p-7 shadow-2xl my-auto"
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.98)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="leaderboard-modal-title"
                className="text-lg sm:text-2xl font-bold text-amber-100"
                style={{ fontFamily: '"Cinzel", Georgia, serif' }}
              >
                Real Players Leaderboard
              </h2>
              <p className="text-xs text-slate-400">
                100% Real Competitors Only (K = 32) · Click any player row to inspect full career stats
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Leaderboard"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-400/50 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedTier('all')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selectedTier === 'all'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              All Tiers
            </button>
            {[...RANK_TIERS].reverse().map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedTier === tier.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {tier.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Sort:</span>
            <button
              type="button"
              onClick={() => setSortBy('elo')}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                sortBy === 'elo'
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              ELO Rating
            </button>
            <button
              type="button"
              onClick={() => setSortBy('wins')}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                sortBy === 'wins'
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              Total Wins
            </button>
            <button
              type="button"
              onClick={() => setSortBy('level')}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                sortBy === 'level'
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              XP Level
            </button>
          </div>
        </div>

        {/* Standings Table */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 overflow-hidden max-h-[52vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 bg-slate-900/90">
                <th className="py-3 px-3 sm:px-4">Standing</th>
                <th className="py-3 px-3 sm:px-4">Real Player</th>
                <th className="py-3 px-3 sm:px-4">Rank Badge &amp; Score</th>
                <th className="py-3 px-3 sm:px-4 text-right">Level</th>
                <th className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">W / L / D</th>
                <th className="py-3 px-3 sm:px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm tabular-nums">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No players in this tier yet. Play matches or connect with friends in Online P2P Rooms!
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const tier = getRankTierByElo(entry.elo);
                  const detailedBadge = getDetailedRankBadge(entry.elo);
                  const avOption =
                    AVATAR_OPTIONS.find((a) => a.id === entry.avatarId) ||
                    AVATAR_OPTIONS[0];

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => onInspectPlayer(entry)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onInspectPlayer(entry);
                        }
                      }}
                      aria-label={`Inspect profile of ${entry.username}`}
                      className={`cursor-pointer transition-colors ${
                        entry.isUser
                          ? 'bg-amber-500/15 hover:bg-amber-500/25 font-semibold'
                          : 'hover:bg-slate-900/80'
                      }`}
                    >
                      <td className="py-3.5 px-3 sm:px-4 font-mono font-bold text-amber-300">
                        Rank #{entry.standing}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                            <PieceSvgIcon
                              type={avOption.pieceType}
                              color={avOption.pieceColor}
                              className="w-4 h-4"
                            />
                          </span>
                          <div className="truncate max-w-[140px] sm:max-w-[210px]">
                            <span className="text-slate-100">{entry.username}</span>
                            {entry.isUser && (
                              <span className="ml-2 text-[11px] text-amber-300 font-mono">
                                · YOU
                              </span>
                            )}
                            {entry.isOnlinePeer && (
                              <span className="ml-2 text-[11px] text-emerald-400 font-mono inline-flex items-center gap-0.5">
                                <Users className="w-3 h-3 inline" /> FRIEND
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded border ${tier.borderClass} ${tier.bgClass} ${tier.textClass}`}
                          >
                            {detailedBadge}
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            • {entry.elo.toLocaleString('en-US')} ELO
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-slate-200">
                        Lv. {entry.level}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-slate-300 hidden sm:table-cell">
                        <span className="text-emerald-400 font-bold">{entry.wins}W</span> ·{' '}
                        {entry.losses}L · {entry.draws}D
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-200 hover:border-amber-400">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Profile</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <span>
            Zero bots or fake accounts — connect with friends in Online P2P Rooms to automatically sync and compare real ratings.
          </span>
          <span className="font-mono text-amber-300">
            Total Registered Real Players: {entries.length}
          </span>
        </div>
      </div>
    </div>
  );
};
