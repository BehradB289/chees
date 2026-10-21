export type RankTierId =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'grandmaster';

export interface RankTierInfo {
  id: RankTierId;
  name: string;
  minElo: number;
  maxElo: number | null;
  colorHex: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
}

export const RANK_TIERS: RankTierInfo[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minElo: 0,
    maxElo: 999,
    colorHex: '#d97706',
    textClass: 'text-amber-500',
    borderClass: 'border-amber-600/50',
    bgClass: 'bg-amber-950/40',
  },
  {
    id: 'silver',
    name: 'Silver',
    minElo: 1000,
    maxElo: 1299,
    colorHex: '#cbd5e1',
    textClass: 'text-slate-200',
    borderClass: 'border-slate-400/50',
    bgClass: 'bg-slate-800/60',
  },
  {
    id: 'gold',
    name: 'Gold',
    minElo: 1300,
    maxElo: 1599,
    colorHex: '#fbbf24',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/60',
    bgClass: 'bg-amber-950/50',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minElo: 1600,
    maxElo: 1899,
    colorHex: '#38bdf8',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/60',
    bgClass: 'bg-sky-950/50',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    minElo: 1900,
    maxElo: 2199,
    colorHex: '#c084fc',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/60',
    bgClass: 'bg-purple-950/50',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    minElo: 2200,
    maxElo: null,
    colorHex: '#f87171',
    textClass: 'text-red-300',
    borderClass: 'border-red-500/70',
    bgClass: 'bg-red-950/55',
  },
];

export interface AvatarOption {
  id: string;
  label: string;
  symbol: string;
  pieceType: 'k' | 'q' | 'n' | 'r' | 'b' | 'p';
  pieceColor: 'w' | 'b';
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'crown', label: 'Sovereign King', symbol: 'K', pieceType: 'k', pieceColor: 'w' },
  { id: 'queen', label: 'Imperial Queen', symbol: 'Q', pieceType: 'q', pieceColor: 'w' },
  { id: 'knight', label: 'Grandmaster Knight', symbol: 'N', pieceType: 'n', pieceColor: 'w' },
  { id: 'rook', label: 'Obsidian Fortress', symbol: 'R', pieceType: 'r', pieceColor: 'b' },
  { id: 'bishop', label: 'Tactical Bishop', symbol: 'B', pieceType: 'b', pieceColor: 'w' },
  { id: 'sword', label: 'Immortal Sovereign', symbol: 'K', pieceType: 'k', pieceColor: 'b' },
];

export interface PlayerProfile {
  id: string;
  username: string;
  avatarId: string;
  elo: number;
  xp: number;
  level: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  isConfigured: boolean;
  updatedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarId: string;
  elo: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  standing: number;
  isUser?: boolean;
  isOnlinePeer?: boolean;
  updatedAt?: number;
}

/**
 * Determines competitive Rank Tier from ELO rating.
 */
export function getRankTierByElo(elo: number): RankTierInfo {
  if (elo >= 2200) return RANK_TIERS[5];
  if (elo >= 1900) return RANK_TIERS[4];
  if (elo >= 1600) return RANK_TIERS[3];
  if (elo >= 1300) return RANK_TIERS[2];
  if (elo >= 1000) return RANK_TIERS[1];
  return RANK_TIERS[0];
}

/**
 * Computes detailed Sub-Tier division badge (e.g., "Gold II", "Silver III", "Grandmaster").
 */
export function getDetailedRankBadge(elo: number): string {
  const tier = getRankTierByElo(elo);
  if (tier.id === 'grandmaster') return 'Grandmaster';
  if (tier.id === 'bronze') {
    if (elo >= 850) return 'Bronze I';
    if (elo >= 650) return 'Bronze II';
    return 'Bronze III';
  }
  const offset = elo - tier.minElo;
  if (offset >= 200) return `${tier.name} I`;
  if (offset >= 100) return `${tier.name} II`;
  return `${tier.name} III`;
}

/**
 * Formats full Rank Standing + Tier Badge + Exact Numeric ELO (e.g. "Rank #1 • Gold II • 1,450 ELO").
 */
export function formatStandingAndElo(standing: number, elo: number): string {
  const badge = getDetailedRankBadge(elo);
  return `Rank #${standing} • ${badge} • ${elo.toLocaleString('en-US')} ELO`;
}

/**
 * Official FIDE ELO Rating Formula with K = 32.
 */
export function calculateFideEloDelta(
  playerElo: number,
  opponentElo: number,
  actualScore: 1 | 0.5 | 0,
  kFactor = 32
): { newElo: number; delta: number; expectedScore: number } {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const rawDelta = Math.round(kFactor * (actualScore - expectedScore));
  const newElo = Math.max(100, playerElo + rawDelta);
  return {
    newElo,
    delta: newElo - playerElo,
    expectedScore,
  };
}

/**
 * Computes Level (1 to 100) and current level progress from total XP.
 */
export function calculateLevelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXpRequired: number;
  progressPercent: number;
} {
  let xpRemaining = Math.max(0, Math.floor(totalXp));
  let level = 1;

  while (level < 100) {
    const req = 120 + (level - 1) * 35;
    if (xpRemaining >= req) {
      xpRemaining -= req;
      level++;
    } else {
      return {
        level,
        currentLevelXp: xpRemaining,
        nextLevelXpRequired: req,
        progressPercent: Math.min(100, Math.round((xpRemaining / req) * 100)),
      };
    }
  }

  return {
    level: 100,
    currentLevelXp: xpRemaining,
    nextLevelXpRequired: 3600,
    progressPercent: 100,
  };
}

/**
 * Calculates XP reward based on match mode, difficulty tier, and outcome.
 */
export function calculateMatchXpReward(
  mode: 'ai' | 'pvp',
  difficulty: 'easy' | 'medium' | 'hard' | 'god',
  outcome: 'win' | 'draw' | 'loss',
  movesPlayed: number
): number {
  const activityBonus = Math.min(25, Math.floor(movesPlayed / 2));

  if (mode === 'pvp') {
    if (outcome === 'win') return 150 + activityBonus;
    if (outcome === 'draw') return 75 + activityBonus;
    return 30 + activityBonus;
  }

  switch (difficulty) {
    case 'easy':
      return (outcome === 'win' ? 25 : outcome === 'draw' ? 12 : 8) + activityBonus;
    case 'medium':
      return (outcome === 'win' ? 55 : outcome === 'draw' ? 25 : 12) + activityBonus;
    case 'hard':
      return (outcome === 'win' ? 100 : outcome === 'draw' ? 45 : 20) + activityBonus;
    case 'god':
      return (outcome === 'win' ? 1000 : outcome === 'draw' ? 500 : 45) + activityBonus;
  }
}

export const AI_TIER_ELO_MAP: Record<'easy' | 'medium' | 'hard' | 'god', number> = {
  easy: 800,
  medium: 1350,
  hard: 2050,
  god: 3500,
};

const PROFILE_STORAGE_KEY = 'gm_chess_profile_v3';
const REAL_PLAYERS_REGISTRY_KEY = 'gm_chess_real_players_registry_v3';

export function createDefaultProfile(): PlayerProfile {
  return {
    id: 'local-' + Math.random().toString(36).slice(2, 9),
    username: 'Grandmaster',
    avatarId: 'crown',
    elo: 1000,
    xp: 0,
    level: 1,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    bestWinStreak: 0,
    isConfigured: false,
    updatedAt: Date.now(),
  };
}

export function loadPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultProfile();
  }
  try {
    const raw =
      window.localStorage.getItem(PROFILE_STORAGE_KEY) ||
      window.localStorage.getItem('gm_chess_profile_v2');
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const xp = typeof parsed.xp === 'number' ? parsed.xp : 0;
    const lvlInfo = calculateLevelFromXp(xp);
    return {
      ...createDefaultProfile(),
      ...parsed,
      level: lvlInfo.level,
    };
  } catch {
    return createDefaultProfile();
  }
}

export function savePlayerProfile(profile: PlayerProfile): PlayerProfile {
  const lvlInfo = calculateLevelFromXp(profile.xp);
  const updated: PlayerProfile = {
    ...profile,
    level: lvlInfo.level,
    updatedAt: Date.now(),
  };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
  }
  return updated;
}

/**
 * Updates a player's profile after completing a match and saves it.
 */
export function recordMatchResult(
  profile: PlayerProfile,
  mode: 'ai' | 'pvp',
  difficulty: 'easy' | 'medium' | 'hard' | 'god',
  opponentElo: number,
  outcome: 'win' | 'draw' | 'loss',
  movesPlayed: number
): {
  updatedProfile: PlayerProfile;
  eloDelta: number;
  xpEarned: number;
  leveledUp: boolean;
  tierChanged: boolean;
} {
  const oldTier = getRankTierByElo(profile.elo).id;
  const oldLevel = profile.level;

  const score: 1 | 0.5 | 0 =
    outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0;

  const effectiveOpponentElo =
    mode === 'ai' && difficulty === 'god' && outcome === 'loss'
      ? Math.max(profile.elo + 350, 2200)
      : opponentElo;

  const { newElo, delta } = calculateFideEloDelta(
    profile.elo,
    effectiveOpponentElo,
    score,
    32
  );

  const xpEarned = calculateMatchXpReward(mode, difficulty, outcome, movesPlayed);
  const newXp = profile.xp + xpEarned;
  const lvlInfo = calculateLevelFromXp(newXp);

  const wins = profile.wins + (outcome === 'win' ? 1 : 0);
  const losses = profile.losses + (outcome === 'loss' ? 1 : 0);
  const draws = profile.draws + (outcome === 'draw' ? 1 : 0);
  const winStreak = outcome === 'win' ? profile.winStreak + 1 : 0;
  const bestWinStreak = Math.max(profile.bestWinStreak, winStreak);

  const updatedProfile = savePlayerProfile({
    ...profile,
    elo: newElo,
    xp: newXp,
    level: lvlInfo.level,
    wins,
    losses,
    draws,
    winStreak,
    bestWinStreak,
  });

  const newTier = getRankTierByElo(updatedProfile.elo).id;

  return {
    updatedProfile,
    eloDelta: delta,
    xpEarned,
    leveledUp: updatedProfile.level > oldLevel,
    tierChanged: newTier !== oldTier,
  };
}

// ============================================================================
// REAL PLAYERS ONLY Leaderboard Registry (Zero Fake/Bot Users)
// ============================================================================
export function loadRealPlayersRegistry(): PlayerProfile[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(REAL_PLAYERS_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlayerProfile[]) : [];
  } catch {
    return [];
  }
}

export function upsertPeerLeaderboardEntry(peerProfile: Partial<PlayerProfile> & { id: string; username: string; elo: number }): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = loadRealPlayersRegistry().filter((p) => p.id !== peerProfile.id);
    const xp = typeof peerProfile.xp === 'number' ? peerProfile.xp : 0;
    const lvl = calculateLevelFromXp(xp).level;
    const normalized: PlayerProfile = {
      id: peerProfile.id,
      username: peerProfile.username,
      avatarId: peerProfile.avatarId || 'knight',
      elo: peerProfile.elo,
      xp,
      level: peerProfile.level ?? lvl,
      wins: peerProfile.wins ?? 0,
      losses: peerProfile.losses ?? 0,
      draws: peerProfile.draws ?? 0,
      winStreak: peerProfile.winStreak ?? 0,
      bestWinStreak: peerProfile.bestWinStreak ?? (peerProfile.winStreak ?? 0),
      isConfigured: true,
      updatedAt: Date.now(),
    };
    existing.push(normalized);
    window.localStorage.setItem(
      REAL_PLAYERS_REGISTRY_KEY,
      JSON.stringify(existing.slice(-50))
    );
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Builds the Real-Players-Only Leaderboard containing ONLY the local user and
 * real online peers synced via WebRTC P2P matches. Assigns 1-indexed `standing` (#1, #2, ...).
 */
export function buildMergedLeaderboard(userProfile: PlayerProfile): LeaderboardEntry[] {
  const realPeers = loadRealPlayersRegistry();
  const map = new Map<string, Omit<LeaderboardEntry, 'standing'>>();

  for (const peer of realPeers) {
    if (peer.id && peer.id !== userProfile.id) {
      map.set(peer.id, {
        id: peer.id,
        username: peer.username,
        avatarId: peer.avatarId || 'knight',
        elo: peer.elo,
        level: peer.level || calculateLevelFromXp(peer.xp || 0).level,
        xp: peer.xp || 0,
        wins: peer.wins || 0,
        losses: peer.losses || 0,
        draws: peer.draws || 0,
        winStreak: peer.winStreak || 0,
        bestWinStreak: peer.bestWinStreak || 0,
        isOnlinePeer: true,
        updatedAt: peer.updatedAt,
      });
    }
  }

  map.set(userProfile.id, {
    id: userProfile.id,
    username: userProfile.username,
    avatarId: userProfile.avatarId,
    elo: userProfile.elo,
    level: userProfile.level,
    xp: userProfile.xp,
    wins: userProfile.wins,
    losses: userProfile.losses,
    draws: userProfile.draws,
    winStreak: userProfile.winStreak,
    bestWinStreak: userProfile.bestWinStreak,
    isUser: true,
    updatedAt: userProfile.updatedAt,
  });

  const sorted = Array.from(map.values()).sort(
    (a, b) => b.elo - a.elo || b.wins - a.wins || b.xp - a.xp
  );

  return sorted.map((entry, idx) => ({
    ...entry,
    standing: idx + 1,
  }));
}

/**
 * Finds the 1-indexed Leaderboard standing (#1, #2, ...) for a given player ID.
 */
export function getPlayerStanding(
  userProfile: PlayerProfile,
  targetPlayerId?: string
): number {
  const standings = buildMergedLeaderboard(userProfile);
  const idToFind = targetPlayerId || userProfile.id;
  const found = standings.find((e) => e.id === idToFind);
  return found ? found.standing : 1;
}

/**
 * Builds an inspectable profile card for the active Stockfish AI opponent when clicked in the HUD.
 */
export function buildAIInspectorProfile(
  difficulty: 'easy' | 'medium' | 'hard' | 'god'
): LeaderboardEntry {
  const metaMap: Record<
    'easy' | 'medium' | 'hard' | 'god',
    { name: string; avatarId: string; elo: number; level: number; xp: number; wins: number; losses: number; draws: number; streak: number }
  > = {
    easy: {
      name: 'Stockfish · Easy (Skill 0)',
      avatarId: 'bishop',
      elo: 800,
      level: 5,
      xp: 900,
      wins: 48,
      losses: 52,
      draws: 10,
      streak: 1,
    },
    medium: {
      name: 'Stockfish · Medium (Skill 5)',
      avatarId: 'knight',
      elo: 1350,
      level: 28,
      xp: 18500,
      wins: 140,
      losses: 60,
      draws: 18,
      streak: 4,
    },
    hard: {
      name: 'Stockfish · Hard (Skill 13)',
      avatarId: 'rook',
      elo: 2050,
      level: 65,
      xp: 88000,
      wins: 450,
      losses: 50,
      draws: 35,
      streak: 11,
    },
    god: {
      name: 'Stockfish 18 · GOD MODE',
      avatarId: 'sword',
      elo: 3500,
      level: 100,
      xp: 250000,
      wins: 991,
      losses: 0,
      draws: 9,
      streak: 99,
    },
  };

  const m = metaMap[difficulty];
  return {
    id: `ai-${difficulty}`,
    username: m.name,
    avatarId: m.avatarId,
    elo: m.elo,
    level: m.level,
    xp: m.xp,
    wins: m.wins,
    losses: m.losses,
    draws: m.draws,
    winStreak: m.streak,
    bestWinStreak: m.streak,
    standing: 1,
  };
}
