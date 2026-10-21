import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import {
  type PlayerProfile,
  AVATAR_OPTIONS,
  getRankTierByElo,
  calculateLevelFromXp,
} from '../progression/progression.ts';
import { PieceSvgIcon } from './ChessIcons.tsx';

export interface ProfileSetupModalProps {
  profile: PlayerProfile;
  onSave: (username: string, avatarId: string) => void;
  onClose: () => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  profile,
  onSave,
  onClose,
}) => {
  const [username, setUsername] = useState(profile.username);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [error, setError] = useState('');

  const tier = getRankTierByElo(profile.elo);
  const lvlInfo = calculateLevelFromXp(profile.xp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setError('Username must be between 2 and 24 characters.');
      return;
    }
    setError('');
    onSave(trimmed, avatarId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(6, 8, 13, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-amber-500/35 p-6 shadow-2xl my-auto"
        style={{ backgroundColor: 'rgba(13, 17, 26, 0.98)' }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2
              id="profile-modal-title"
              className="text-xl font-bold text-amber-100"
              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
            >
              Competitor Profile &amp; Career Record
            </h2>
            <p className="text-xs text-slate-400">
              Customize your identity for Global Standings &amp; P2P Online Matches
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Profile Modal"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Career Summary Strip */}
        <div className="grid grid-cols-3 gap-2.5 my-4 text-center tabular-nums">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">RANK TIER</div>
            <div className={`text-sm font-bold mt-1 ${tier.textClass}`}>
              {tier.name.split('·')[0].trim()} ({profile.elo})
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">LEVEL &amp; XP</div>
            <div className="text-sm font-bold text-slate-100 mt-1">
              Lv. {lvlInfo.level} · {profile.xp} XP
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">RECORD / STREAK</div>
            <div className="text-sm font-bold text-emerald-300 mt-1">
              {profile.wins}W-{profile.losses}L · {profile.winStreak} Streak
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="profile-username-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Competitor Username
            </label>
            <input
              id="profile-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              placeholder="Enter Grandmaster handle..."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-2">
              Select Crest Avatar
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((av) => {
                const selected = avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarId(av.id)}
                    aria-label={av.label}
                    aria-pressed={selected}
                    className={`min-h-[54px] rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                      selected
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <PieceSvgIcon
                      type={av.pieceType}
                      color={av.pieceColor}
                      className="w-6 h-6"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
