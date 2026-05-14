/**
 * RoboticAvatar – lightweight fallback stub.
 *
 * The original 3D animated avatar (frontend/components/RoboticAvatar/) is
 * excluded from source control via .gitignore because it contains large binary
 * assets.  This stub exports the same public interface so that
 * ChatGPTStyleChatbot.tsx compiles and runs on every platform without the
 * heavyweight asset bundle.
 *
 * Replace this file with the full implementation on machines that have the
 * original RoboticAvatar/ directory available.
 */

import React, { useCallback, useReducer } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RobotState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'success'
  | 'error';

export type EmotionalState =
  | 'neutral'
  | 'happy'
  | 'focused'
  | 'curious'
  | 'excited';

export interface RoboticAvatarProps {
  state: RobotState;
  isSpeaking?: boolean;
  isListening?: boolean;
  audioLevel?: number;
  spokenText?: string;
  emotionalState?: EmotionalState;
  size?: 'small' | 'medium' | 'large';
  showEffects?: boolean;
  onInteraction?: () => void;
}

export interface RobotStateMachineOptions {
  autoTransition?: boolean;
  thinkingDuration?: number;
  successDuration?: number;
}

export interface RobotStateMachineResult {
  state: RobotState;
  emotionalState: EmotionalState;
  transition: (next: RobotState) => void;
  /** Convenience helpers used by ChatGPTStyleChatbot */
  goIdle: () => void;
  startSpeaking: () => void;
  startListening: () => void;
  startThinking: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRobotStateMachine(
  _options?: RobotStateMachineOptions,
): RobotStateMachineResult {
  type S = { state: RobotState; emotionalState: EmotionalState };
  const [{ state, emotionalState }, dispatch] = useReducer(
    (_prev: S, next: RobotState): S => {
      const emotional: EmotionalState =
        next === 'success' ? 'happy'
        : next === 'thinking' ? 'focused'
        : next === 'listening' ? 'curious'
        : next === 'speaking' ? 'excited'
        : 'neutral';
      return { state: next, emotionalState: emotional };
    },
    { state: 'idle', emotionalState: 'neutral' },
  );

  const transition = useCallback(
    (next: RobotState) => dispatch(next),
    [],
  );

  const goIdle       = useCallback(() => dispatch('idle'),      []);
  const startSpeaking  = useCallback(() => dispatch('speaking'),  []);
  const startListening = useCallback(() => dispatch('listening'), []);
  const startThinking  = useCallback(() => dispatch('thinking'),  []);

  return { state, emotionalState, transition, goIdle, startSpeaking, startListening, startThinking };
}

// ─── Component ────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<NonNullable<RoboticAvatarProps['size']>, number> = {
  small: 64,
  medium: 96,
  large: 128,
};

const STATE_COLORS: Record<RobotState, string> = {
  idle:      '#4B5563', // gray-600
  listening: '#06B6D4', // cyan-500
  thinking:  '#F59E0B', // amber-500
  speaking:  '#A855F7', // purple-500
  success:   '#10B981', // emerald-500
  error:     '#EF4444', // red-500
};

export const RoboticAvatar: React.FC<RoboticAvatarProps> = ({
  state,
  isSpeaking,
  isListening,
  audioLevel = 0,
  size = 'medium',
  onInteraction,
}) => {
  const px = SIZE_MAP[size];
  const color = STATE_COLORS[state] ?? STATE_COLORS.idle;
  const isActive = isSpeaking || isListening;
  const pulse = isActive ? audioLevel * 0.4 : 0; // subtle scale offset

  return (
    <button
      type="button"
      onClick={onInteraction}
      aria-label={`AI assistant – ${state}`}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        background: 'radial-gradient(circle at 35% 35%, #1e293b, #0f172a)',
        boxShadow: isActive
          ? `0 0 ${12 + audioLevel * 20}px ${color}88`
          : `0 0 8px ${color}44`,
        transform: `scale(${1 + pulse})`,
        transition: 'transform 0.1s ease, box-shadow 0.15s ease',
        cursor: onInteraction ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Simple robot "face" — two dots + mouth */}
      <svg
        viewBox="0 0 40 40"
        width={px * 0.55}
        height={px * 0.55}
        aria-hidden="true"
      >
        {/* Eyes */}
        <circle cx="13" cy="16" r="3.5" fill={color} opacity={0.9} />
        <circle cx="27" cy="16" r="3.5" fill={color} opacity={0.9} />
        {/* Mouth – arc that changes with state */}
        {state === 'success' || state === 'speaking' ? (
          <path
            d="M12 26 Q20 33 28 26"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        ) : state === 'error' ? (
          <path
            d="M12 30 Q20 24 28 30"
            stroke={color}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <line
            x1="13"
            y1="28"
            x2="27"
            y2="28"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
};

export default RoboticAvatar;
