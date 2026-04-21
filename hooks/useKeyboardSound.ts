// hooks/useKeyboardSound.ts

import { useCallback, useEffect, useState } from 'react';
import useSound from 'use-sound';

// === Type Definitions ===

export type SoundPackId = 
  | 'disabled'
  | 'cherry-mx-blue'
  | 'cherry-mx-brown'
  | 'holy-panda'
  | 'topre'
  | 'buckling-spring'
  | 'novelkeys-cream';

export interface SoundPack {
  id: SoundPackId;
  name: string;
  description: string;
  type: string; // e.g., "Clicky", "Tactile", "Linear"
}

// === Sound Pack Constants ===

export const SOUND_PACKS: SoundPack[] = [
  { 
    id: 'disabled', 
    name: 'Disabled', 
    description: 'No keyboard sounds',
    type: 'None'
  },
  { 
    id: 'cherry-mx-blue', 
    name: 'Cherry MX Blue', 
    description: 'Classic clicky mechanical switch',
    type: 'Clicky'
  },
  { 
    id: 'cherry-mx-brown', 
    name: 'Cherry MX Brown', 
    description: 'Popular tactile switch with quiet operation',
    type: 'Tactile'
  },
  { 
    id: 'holy-panda', 
    name: 'Holy Panda', 
    description: 'Premium tactile with sharp tactility',
    type: 'Premium Tactile'
  },
  { 
    id: 'topre', 
    name: 'Topre', 
    description: 'Unique "thock" sound from electro-capacitive mechanism',
    type: 'Electro-Capacitive'
  },
  { 
    id: 'buckling-spring', 
    name: 'Buckling Spring', 
    description: 'IBM Model M typewriter sound',
    type: 'Vintage Clicky'
  },
  { 
    id: 'novelkeys-cream', 
    name: 'NovelKeys Cream', 
    description: 'Smooth linear with deep sound profile',
    type: 'Linear'
  },
];

// === Sound Hook ===

interface UseKeyboardSoundOptions {
  soundPackId?: SoundPackId;
  volume?: number; // 0-1
  enabled?: boolean;
}

interface UseKeyboardSoundReturn {
  playKeypress: () => void;
  playError: () => void;
  soundPackId: SoundPackId;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for keyboard sound effects
 * Provides non-blocking sound playback with preloading
 */
export const useKeyboardSound = ({
  soundPackId = 'disabled',
  volume = 0.5,
  enabled = true,
}: UseKeyboardSoundOptions = {}): UseKeyboardSoundReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get sound file paths
  const soundPath = soundPackId !== 'disabled' 
    ? `/sounds/${soundPackId}/keypress.mp3` 
    : null;
  
  const errorSoundPath = soundPackId !== 'disabled'
    ? `/sounds/${soundPackId}/error.wav`
    : null;

  // Initialize keypress sound with use-sound library
  const [playSound] = useSound(soundPath || '', {
    volume: volume,
    soundEnabled: enabled && soundPackId !== 'disabled',
    onload: () => setIsLoading(false),
    onloaderror: (_id: unknown, err: unknown) => {
      console.warn(`[Keyboard Sound] Failed to load sound: ${soundPackId}`, err);
      setError(new Error(`Failed to load sound: ${soundPackId}`));
      setIsLoading(false);
    },
  });

  // Initialize error sound
  const [playErrorSound] = useSound(errorSoundPath || '', {
    volume: volume,
    soundEnabled: enabled && soundPackId !== 'disabled',
    onloaderror: (_id: unknown, err: unknown) => {
      console.warn(`[Keyboard Sound] Failed to load error sound: ${soundPackId}`, err);
    },
  });

  // Preload indicator
  useEffect(() => {
    if (soundPackId !== 'disabled' && enabled) {
      setIsLoading(true);
      setError(null);
    }
  }, [soundPackId, enabled]);

  // Play keypress sound (non-blocking, silent fail)
  const playKeypress = useCallback(() => {
    if (!enabled || soundPackId === 'disabled') {
      return;
    }

    try {
      // Performance measurement (development only)
      if (process.env.NODE_ENV === 'development') {
        const start = performance.now();
        playSound();
        const end = performance.now();
        const latency = end - start;
        
        // Warn if latency exceeds 10ms target
        if (latency > 10) {
          console.warn(`[Keyboard Sound] High latency: ${latency.toFixed(2)}ms (target: <10ms)`);
        }
      } else {
        playSound();
      }
    } catch (err) {
      // Silent fail - don't disrupt typing experience
      console.warn('[Keyboard Sound] Playback error:', err);
    }
  }, [playSound, enabled, soundPackId]);

  // Play error sound for incorrect keystrokes (non-blocking, silent fail)
  const playError = useCallback(() => {
    if (!enabled || soundPackId === 'disabled') {
      return;
    }

    try {
      playErrorSound();
    } catch (err) {
      // Silent fail - don't disrupt typing experience
      console.warn('[Keyboard Sound] Error sound playback failed:', err);
    }
  }, [playErrorSound, enabled, soundPackId]);

  return {
    playKeypress,
    playError,
    soundPackId,
    isLoading,
    error,
  };
};
