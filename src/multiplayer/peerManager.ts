import Peer, { type DataConnection } from 'peerjs';
import { type Color } from 'chess.js';
import {
  type PlayerProfile,
  upsertPeerLeaderboardEntry,
} from '../progression/progression.ts';

export type TimeControlId = 'unlimited' | 'blitz-3m' | 'rapid-10m';

export interface TimeControlConfig {
  id: TimeControlId;
  label: string;
  shortLabel: string;
  initialMs: number;
}

export const TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'unlimited',
    label: 'Unlimited (∞)',
    shortLabel: '∞ Unlimited',
    initialMs: 0,
  },
  {
    id: 'blitz-3m',
    label: '3 Min Blitz',
    shortLabel: '3m Blitz',
    initialMs: 3 * 60 * 1000,
  },
  {
    id: 'rapid-10m',
    label: '10 Min Rapid',
    shortLabel: '10m Rapid',
    initialMs: 10 * 60 * 1000,
  },
];

export interface StickerPreset {
  id: string;
  emoji: string;
  label: string;
}

export const STICKER_PRESETS: StickerPreset[] = [
  { id: 'fire', emoji: '🔥', label: 'Brilliant!' },
  { id: 'cool', emoji: '😎', label: 'Checkmate incoming' },
  { id: 'thinking', emoji: '🤔', label: 'Thinking...' },
  { id: 'blunder', emoji: '😱', label: 'Blunder!' },
  { id: 'gg', emoji: '🤝', label: 'Good Game!' },
  { id: 'laugh', emoji: '😂', label: 'Laughing' },
  { id: 'hurry', emoji: '⏳', label: 'Hurry up!' },
];

export type P2PMessage =
  | {
      type: 'hello';
      profile: PlayerProfile;
      hostColor?: Color;
      timeControl?: TimeControlId;
    }
  | {
      type: 'profile_sync';
      profile: PlayerProfile;
    }
  | {
      type: 'move';
      moveId: string;
      from: string;
      to: string;
      promotion?: string;
      san: string;
      fen: string;
      whiteTimeMs: number;
      blackTimeMs: number;
    }
  | {
      type: 'emote';
      stickerId: string;
      emoji: string;
      label: string;
      senderName: string;
    }
  | {
      type: 'chat';
      text: string;
      senderName: string;
      sentAt: number;
    }
  | {
      type: 'resign';
    }
  | {
      type: 'draw_offer';
    }
  | {
      type: 'draw_accept';
    }
  | {
      type: 'draw_decline';
    }
  | {
      type: 'rematch_request';
    }
  | {
      type: 'rematch_accept';
      newHostColor: Color;
      timeControl: TimeControlId;
    }
  | {
      type: 'ping';
      sentAt: number;
    }
  | {
      type: 'pong';
      sentAt: number;
    };

/**
 * Generates a clean, memorable Room Code formatted as CHESS-XXXXX (e.g. CHESS-8492K).
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CHESS-${suffix}`;
}

/**
 * Normalizes any user-entered room code (e.g. "8492K", "chess-8492k", "CHESS-8492K")
 * to canonical "CHESS-XXXXX" format.
 */
export function normalizeRoomCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('CHESS-')) return cleaned;
  return `CHESS-${cleaned}`;
}

export function roomCodeToPeerId(roomCode: string): string {
  const norm = normalizeRoomCode(roomCode);
  return `gm3d-chess-room-${norm.toLowerCase()}`;
}

export function buildRoomInviteUrl(roomCode: string): string {
  if (typeof window === 'undefined') return `?room=${roomCode}`;
  const url = new URL(window.location.href);
  url.searchParams.set('room', normalizeRoomCode(roomCode));
  url.searchParams.delete('autostart');
  return url.toString();
}

export interface P2PSessionCallbacks {
  onStatusChange: (
    status: 'idle' | 'hosting' | 'joining' | 'connected' | 'disconnected' | 'error',
    detail?: string
  ) => void;
  onOpponentProfile: (
    profile: PlayerProfile,
    assignedLocalColor: Color,
    timeControl: TimeControlId,
    isInitialConnect: boolean
  ) => void;
  onRemoteMove: (payload: Extract<P2PMessage, { type: 'move' }>) => void;
  onRemoteEmote: (payload: Extract<P2PMessage, { type: 'emote' }>) => void;
  onRemoteChat: (payload: Extract<P2PMessage, { type: 'chat' }>) => void;
  onRemoteResign: () => void;
  onDrawOfferReceived: () => void;
  onDrawAccepted: () => void;
  onDrawDeclined: () => void;
  onRematchRequested: () => void;
  onRematchAccepted: (newLocalColor: Color, timeControl: TimeControlId) => void;
  onPingUpdated: (pingMs: number) => void;
}

export class ChessP2PManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private pingIntervalId: number | null = null;
  private callbacks: P2PSessionCallbacks;
  private localProfile: PlayerProfile;
  private isHost = false;
  private hostColor: Color = 'w';
  private timeControl: TimeControlId = 'unlimited';
  private processedMoveIds = new Set<string>();
  public currentRoomCode = '';

  constructor(localProfile: PlayerProfile, callbacks: P2PSessionCallbacks) {
    this.localProfile = localProfile;
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: P2PSessionCallbacks): void {
    this.callbacks = callbacks;
  }

  public updateLocalProfile(profile: PlayerProfile, broadcastToPeer = false): void {
    this.localProfile = profile;
    if (broadcastToPeer) {
      this.send({ type: 'profile_sync', profile });
    }
  }

  public createRoom(
    hostColor: Color = 'w',
    timeControl: TimeControlId = 'unlimited',
    customRoomCode?: string
  ): string {
    this.disconnect();
    this.isHost = true;
    this.hostColor = hostColor;
    this.timeControl = timeControl;
    this.processedMoveIds.clear();

    const code = normalizeRoomCode(customRoomCode || generateRoomCode());
    this.currentRoomCode = code;
    const peerId = roomCodeToPeerId(code);

    this.callbacks.onStatusChange('hosting', `Waiting for opponent in ${code}...`);

    try {
      const peer = new Peer(peerId);
      this.peer = peer;

      peer.on('open', () => {
        this.callbacks.onStatusChange('hosting', `Room ${code} Ready`);
      });

      peer.on('connection', (incomingConn) => {
        if (this.conn && this.conn.open) {
          incomingConn.close();
          return;
        }
        this.bindConnection(incomingConn);
      });

      peer.on('error', (err) => {
        this.callbacks.onStatusChange(
          'error',
          err?.message || 'Unable to initialize P2P room'
        );
      });
    } catch (err) {
      this.callbacks.onStatusChange(
        'error',
        err instanceof Error ? err.message : 'WebRTC initialization failed'
      );
    }

    return code;
  }

  public joinRoom(rawRoomCode: string): string {
    this.disconnect();
    this.isHost = false;
    this.processedMoveIds.clear();
    const code = normalizeRoomCode(rawRoomCode);
    this.currentRoomCode = code;
    const targetPeerId = roomCodeToPeerId(code);

    this.callbacks.onStatusChange('joining', `Connecting to ${code}...`);

    try {
      const peer = new Peer();
      this.peer = peer;

      peer.on('open', () => {
        const outConn = peer.connect(targetPeerId, { reliable: true });
        this.bindConnection(outConn);
      });

      peer.on('error', (err) => {
        this.callbacks.onStatusChange(
          'error',
          err?.message || `Could not connect to room ${code}`
        );
      });
    } catch (err) {
      this.callbacks.onStatusChange(
        'error',
        err instanceof Error ? err.message : 'Failed to join room'
      );
    }

    return code;
  }

  private bindConnection(conn: DataConnection): void {
    // Ensure listeners are bound strictly ONCE on this connection instance
    conn.removeAllListeners();
    this.conn = conn;

    conn.on('open', () => {
      this.callbacks.onStatusChange('connected', 'Opponent Connected');
      this.send({
        type: 'hello',
        profile: this.localProfile,
        hostColor: this.isHost ? this.hostColor : undefined,
        timeControl: this.isHost ? this.timeControl : undefined,
      });

      this.startPingLoop();
    });

    conn.on('data', (raw) => {
      const msg = raw as P2PMessage;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

      switch (msg.type) {
        case 'hello': {
          upsertPeerLeaderboardEntry(msg.profile);

          if (!this.isHost && msg.hostColor) {
            this.hostColor = msg.hostColor;
          }
          if (!this.isHost && msg.timeControl) {
            this.timeControl = msg.timeControl;
          }

          const assignedLocalColor: Color = this.isHost
            ? this.hostColor
            : this.hostColor === 'w'
            ? 'b'
            : 'w';

          this.callbacks.onOpponentProfile(
            msg.profile,
            assignedLocalColor,
            this.timeControl,
            true
          );
          break;
        }
        case 'profile_sync': {
          upsertPeerLeaderboardEntry(msg.profile);
          const assignedLocalColor: Color = this.isHost
            ? this.hostColor
            : this.hostColor === 'w'
            ? 'b'
            : 'w';
          this.callbacks.onOpponentProfile(
            msg.profile,
            assignedLocalColor,
            this.timeControl,
            false
          );
          break;
        }
        case 'move': {
          if (msg.moveId && this.processedMoveIds.has(msg.moveId)) {
            return;
          }
          if (msg.moveId) {
            this.processedMoveIds.add(msg.moveId);
          }
          this.callbacks.onRemoteMove(msg);
          break;
        }
        case 'emote':
          this.callbacks.onRemoteEmote(msg);
          break;
        case 'chat':
          this.callbacks.onRemoteChat(msg);
          break;
        case 'resign':
          this.callbacks.onRemoteResign();
          break;
        case 'draw_offer':
          this.callbacks.onDrawOfferReceived();
          break;
        case 'draw_accept':
          this.callbacks.onDrawAccepted();
          break;
        case 'draw_decline':
          this.callbacks.onDrawDeclined();
          break;
        case 'rematch_request':
          this.callbacks.onRematchRequested();
          break;
        case 'rematch_accept': {
          this.processedMoveIds.clear();
          this.hostColor = msg.newHostColor;
          this.timeControl = msg.timeControl;
          const newLocalColor: Color = this.isHost
            ? this.hostColor
            : this.hostColor === 'w'
            ? 'b'
            : 'w';
          this.callbacks.onRematchAccepted(newLocalColor, this.timeControl);
          break;
        }
        case 'ping':
          this.send({ type: 'pong', sentAt: msg.sentAt });
          break;
        case 'pong': {
          const rtt = Math.max(1, Math.round(performance.now() - msg.sentAt));
          this.callbacks.onPingUpdated(rtt);
          break;
        }
      }
    });

    conn.on('close', () => {
      this.stopPingLoop();
      this.callbacks.onStatusChange('disconnected', 'Opponent Disconnected');
    });

    conn.on('error', () => {
      this.callbacks.onStatusChange('error', 'Connection interrupted');
    });
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    if (typeof window === 'undefined') return;
    this.pingIntervalId = window.setInterval(() => {
      if (this.conn && this.conn.open) {
        this.send({ type: 'ping', sentAt: performance.now() });
      }
    }, 3000);
  }

  private stopPingLoop(): void {
    if (this.pingIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  public send(msg: P2PMessage): void {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch {
        // ignore transient send error
      }
    }
  }

  public disconnect(): void {
    this.stopPingLoop();
    if (this.conn) {
      try {
        this.conn.removeAllListeners();
        this.conn.close();
      } catch {
        // ignore
      }
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.removeAllListeners();
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
  }
}
