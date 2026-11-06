import { useMemo } from 'react';
import { useLocalPreference } from '../../../hooks/useLocalPreference';
import { createWebAudioChime, type ChimePlayer } from './chime-player';

const SOUND_KEY = 'bigger.kitchen.sound';

export interface KitchenSound {
  soundOn: boolean;
  player: ChimePlayer;
  /** Turning it on plays a sample: that tap is also what lets the browser allow audio. */
  toggle: () => void;
}

export function useKitchenSound(
  createPlayer: () => ChimePlayer = createWebAudioChime,
): KitchenSound {
  const [soundOn, setSoundOn] = useLocalPreference(SOUND_KEY, false);
  const player = useMemo(createPlayer, [createPlayer]);
  return {
    soundOn,
    player,
    toggle: () => {
      if (!soundOn) player.play().catch(() => undefined);
      setSoundOn(!soundOn);
    },
  };
}
