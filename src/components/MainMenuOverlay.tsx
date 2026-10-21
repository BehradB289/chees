import React, { useState } from 'react';
import { type Color } from 'chess.js';
import {
  Trophy,
  UserCheck,
  Wifi,
  Cpu,
  Copy,
  Check,
  Share2,
  Clock,
  Sparkles,
  LogIn,
  Eye,
} from 'lucide-react';
import { type AIDifficulty, AI_DIFFICULTIES } from '../engine/chessAI.ts';
import {
  type PlayerProfile,
  AVATAR_OPTIONS,
  getRankTierByElo,
  getDetailedRankBadge,
  calculateLevelFromXp,
  getPlayerStanding,
} from '../progression/progression.ts';
import {
  type TimeControlId,
  TIME_CONTROLS,
  buildRoomInviteUrl,
} from '../multiplayer/peerManager.ts';
import { PieceSvgIcon, RoyalTitleCrestSvg } from './ChessIcons.tsx';

export interface MainMenuOverlayProps {
  profile: PlayerProfile;
  matchMode: 'ai' | 'pvp';
  difficulty: AIDifficulty;
  playerColor: Color;
  timeControl: TimeControlId;
  p2pStatus: 'idle' | 'hosting' | 'joining' | 'connected' | 'disconnected' | 'error';
  p2pStatusDetail: string;
  hostedRoomCode: string;
  onSelectMatchMode: (mode: 'ai' | 'pvp') => void;
  onSelectDifficulty: (diff: AIDifficulty) => void;
  onSelectColor: (color: Color) => void;
  onSelectTimeControl: (tc: TimeControlId) => void;
  onStartMatch: () => void;
  onCreateOnlineRoom: () => void;
  onJoinOnlineRoom: (code: string) => void;
  onCancelOnlineRoom: () => void;
  onOpenLeaderboard: () => void;
  onOpenProfileModal: () => void;
  onInspectSelf: () => void;
}

export const MainMenuOverlay: React.FC<MainMenuOverlayProps> = ({
  profile,
  matchMode,
  difficulty,
  playerColor,
  timeControl,
  p2pStatus,
  p2pStatusDetail,
  hostedRoomCode,
  onSelectMatchMode,
  onSelectDifficulty,
  onSelectColor,
  onSelectTimeControl,
  onStartMatch,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onCancelOnlineRoom,
  onOpenLeaderboard,
  onOpenProfileModal,
  onInspectSelf,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const rankTier = getRankTierByElo(profile.elo);
  const detailedBadge = getDetailedRankBadge(profile.elo);
  const standing = getPlayerStanding(profile);
  const levelInfo = calculateLevelFromXp(profile.xp);
  const avatarOption =
    AVATAR_OPTIONS.find((a) => a.id === profile.avatarId) || AVATAR_OPTIONS[0];
  const totalMatches = profile.wins + profile.losses + profile.draws;
  const winRatePercent =
    totalMatches > 0 ? Math.round((profile.wins / totalMatches) * 100) : 0;

  const handleCopyCode = () => {
    if (!hostedRoomCode || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(hostedRoomCode).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!hostedRoomCode || typeof navigator === 'undefined') return;
    const url = buildRoomInviteUrl(hostedRoomCode);
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinOnlineRoom(joinCodeInput.trim());
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(8, 10, 15, 0.80)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-title-heading"
    >
      <div
        className="w-full max-w-5xl rounded-2xl border border-amber-500/25 p-4 sm:p-6 shadow-2xl my-auto"
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.97)' }}
      >
        {/* 1. HERO TOP BAR: Title Lockup + Clickable Competitor Profile Card & Career Stats Summary */}
        <div className="flex flex-col gap-3.5 pb-4 mb-4 border-b border-slate-800/90">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <RoyalTitleCrestSvg className="w-11 h-11 sm:w-13 sm:h-13 shrink-0" />
              <div>
                <h1
                  id="game-title-heading"
                  className="text-xl sm:text-3xl font-bold tracking-wider text-amber-100"
                  style={{
                    fontFamily: '"Cinzel", Georgia, serif',
                    textShadow: '0 2px 18px rgba(245, 158, 11, 0.35)',
                    textWrap: 'balance',
                  }}
                >
                  Grandmaster 3D Chess
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  Sculpted Staunton 3D Edition · Stockfish 18 UCI · WebRTC Online P2P
                </p>
              </div>
            </div>

            {/* Clickable Hero Player Profile Card + Edit & Leaderboard Buttons */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
              <button
                type="button"
                onClick={onInspectSelf}
                aria-label={`Inspect ${profile.username} Career Profile`}
                title="Click to inspect full career stats"
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/95 border border-slate-800 hover:border-amber-400/50 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <PieceSvgIcon
                    type={avatarOption.pieceType}
                    color={avatarOption.pieceColor}
                    className="w-5 h-5"
                  />
                </div>
                <div className="min-w-[165px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[115px]">
                      {profile.username}
                    </span>
                    <span className="text-[11px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Rank #{standing}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono tabular-nums">
                    <span
                      className={`font-sans font-semibold px-1.5 py-0.2 rounded border ${rankTier.borderClass} ${rankTier.bgClass} ${rankTier.textClass}`}
                    >
                      {detailedBadge}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-300 font-bold">
                      {profile.elo.toLocaleString('en-US')} ELO
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">Lv.{levelInfo.level}</span>
                  </div>
                  {/* XP Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  aria-label="Edit Player Profile"
                  className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:border-amber-400/50 text-xs font-semibold text-slate-200 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenLeaderboard}
                  aria-label="Open Leaderboard"
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>Leaderboard</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scannable Career Stats Summary Strip (Wins, Losses, Draws, Win Rate %, Streak, XP to Next Level) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono tabular-nums">
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
              <div className="text-[10px] font-sans text-slate-400">WINS</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-400">
                {profile.wins}
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
              <div className="text-[10px] font-sans text-slate-400">LOSSES</div>
              <div className="text-xs sm:text-sm font-bold text-slate-200">
                {profile.losses}
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
              <div className="text-[10px] font-sans text-slate-400">DRAWS</div>
              <div className="text-xs sm:text-sm font-bold text-slate-300">
                {profile.draws}
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
              <div className="text-[10px] font-sans text-slate-400">WIN RATE</div>
              <div className="text-xs sm:text-sm font-bold text-amber-300">
                {winRatePercent}%
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
              <div className="text-[10px] font-sans text-slate-400">WIN STREAK</div>
              <div className="text-xs sm:text-sm font-bold text-amber-200">
                {profile.winStreak} (Best {profile.bestWinStreak})
              </div>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
              <div className="text-[10px] font-sans text-slate-400">
                NEXT LEVEL XP
              </div>
              <div className="text-xs sm:text-sm font-bold text-sky-300">
                {levelInfo.currentLevelXp}/{levelInfo.nextLevelXpRequired}
              </div>
            </div>
          </div>
        </div>

        {/* 2. GAME MODE TABS & TIME CONTROL SELECTOR (INCLUDING UNLIMITED ∞ MODE) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onSelectMatchMode('ai')}
              aria-pressed={matchMode === 'ai'}
              className={`min-h-[42px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                matchMode === 'ai'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Singleplayer AI</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMatchMode('pvp')}
              aria-pressed={matchMode === 'pvp'}
              className={`min-h-[42px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                matchMode === 'pvp'
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wifi className="w-4 h-4 shrink-0" />
              <span>Online P2P Room</span>
            </button>
          </div>

          {/* Time Control Selector: Unlimited (∞) | 3 Min Blitz | 10 Min Rapid */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Time Control:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => onSelectTimeControl(tc.id)}
                  aria-pressed={timeControl === tc.id}
                  className={`min-h-[38px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors text-center whitespace-nowrap ${
                    timeControl === tc.id
                      ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3A. SINGLEPLAYER AI MODE (4 CALIBRATED WIN-RATE TIERS) */}
        {matchMode === 'ai' && (
          <>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide">
                  Select Stockfish Opponent Calibration
                </h2>
                <span className="text-xs text-amber-300 font-mono tabular-nums">
                  {AI_DIFFICULTIES.find((d) => d.id === difficulty)?.winRateLabel} ·{' '}
                  {AI_DIFFICULTIES.find((d) => d.id === difficulty)?.elo}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {AI_DIFFICULTIES.map((tier) => {
                  const isSelected = difficulty === tier.id;
                  const isGod = tier.id === 'god';

                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => onSelectDifficulty(tier.id)}
                      aria-pressed={isSelected}
                      className={`group relative flex flex-col justify-between text-left rounded-xl p-3.5 transition-all min-h-[154px] border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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
                            className={`text-sm sm:text-base font-bold tracking-tight whitespace-nowrap ${
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

                        <div className="flex items-center justify-between text-[11px] mb-2">
                          <span className="text-slate-400">{tier.subtitle}</span>
                          <span
                            className={`font-mono font-semibold ${
                              isGod ? 'text-red-300' : 'text-emerald-400'
                            }`}
                          >
                            {tier.winRateLabel}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-300/90">
                          {tier.description}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          Skill {tier.skillLevel} · Depth {tier.depth}
                        </span>
                        <span
                          className={`font-sans font-semibold ${
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
          </>
        )}

        {/* 3B. REAL-TIME ONLINE P2P MULTIPLAYER LOBBY (PeerJS WebRTC) */}
        {matchMode === 'pvp' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            {/* Create Online Room Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-amber-200">
                    Create Online Room
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    WebRTC P2P Host
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Generate a short 5-character Room Code and shareable invite link (<code className="text-amber-300">?room=CHESS-XXXX</code>) that auto-connects your friend and syncs your selected time control.
                </p>

                {/* Host Color Choice */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-300 font-semibold">Host Plays:</span>
                  <button
                    type="button"
                    onClick={() => onSelectColor('w')}
                    className={`min-h-[38px] px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      playerColor === 'w'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <PieceSvgIcon type="k" color="w" className="w-3.5 h-3.5" />
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectColor('b')}
                    className={`min-h-[38px] px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      playerColor === 'b'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <PieceSvgIcon type="k" color="b" className="w-3.5 h-3.5" />
                    Black
                  </button>
                </div>

                {hostedRoomCode && p2pStatus === 'hosting' && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 mb-4">
                    <div className="text-[11px] text-slate-400 mb-1">
                      ACTIVE ROOM CODE ({TIME_CONTROLS.find((t) => t.id === timeControl)?.label})
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-xl font-mono font-bold tracking-wider text-emerald-300 tabular-nums"
                        data-testid="hosted-room-code"
                      >
                        {hostedRoomCode}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedCode ? 'Copied' : 'Code'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyInviteLink}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-semibold text-emerald-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink ? (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedLink ? 'Link Copied' : 'Invite Link'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>{p2pStatusDetail || 'Waiting for opponent to join...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {p2pStatus === 'hosting' ? (
                <button
                  type="button"
                  onClick={onCancelOnlineRoom}
                  className="min-h-[46px] w-full rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-950/50 text-red-200 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Cancel Room ({hostedRoomCode})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCreateOnlineRoom}
                  className="min-h-[46px] w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Create Online Room
                </button>
              )}
            </div>

            {/* Join Friend's Room Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-emerald-300">
                    Join Friend&apos;s Room
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Instant P2P Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Enter your friend&apos;s 5-character room code (e.g., <code className="text-amber-300">CHESS-8492K</code>) to synchronize profiles, real-players leaderboard, and 3D board moves.
                </p>

                <form onSubmit={handleJoinSubmit} className="space-y-3">
                  <div>
                    <label
                      htmlFor="join-room-code-input"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      Room Code
                    </label>
                    <input
                      id="join-room-code-input"
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="CHESS-8492K"
                      maxLength={14}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 font-mono text-sm text-slate-100 uppercase tracking-wider focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {p2pStatus !== 'idle' && p2pStatus !== 'hosting' && (
                    <div className="text-xs font-medium text-amber-300 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2">
                      Status: {p2pStatusDetail || p2pStatus}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="min-h-[46px] w-full rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Join Online Room</span>
                  </button>
                </form>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                Both players&apos; ELO ratings, Rank Badges, and career wins sync into each other&apos;s Real-Players Leaderboard upon connection.
              </div>
            </div>
          </div>
        )}

        {/* Non-interactive Flat Control Hint Line */}
        <div className="mt-4 text-center text-[11px] text-slate-400">
          Tap or Click Square to Move · Drag to Orbit 3D Board · Pinch or Scroll to Zoom · Press P or Esc to Pause
        </div>
      </div>
    </div>
  );
};
