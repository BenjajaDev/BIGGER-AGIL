/** Plays the sound of a new order. A port, so tests (and other devices) can swap the speaker. */
export interface ChimePlayer {
  play: () => Promise<void>;
}

/** Two rising tones, about half a second: noticeable over a kitchen, not alarming. */
const TONES: readonly { hz: number; offset: number }[] = [
  { hz: 880, offset: 0 },
  { hz: 1318.5, offset: 0.2 },
];
const TONE_SECONDS = 0.3;
const PEAK_GAIN = 0.3;

/** Web Audio: no sound files and no dependencies. The context is created on first use. */
export function createWebAudioChime(): ChimePlayer {
  let context: AudioContext | undefined;
  return {
    play: async () => {
      context ??= new AudioContext();
      // Browsers keep audio suspended until a tap; turning the sound on is that tap.
      if (context.state === 'suspended') await context.resume();
      const start = context.currentTime;
      for (const { hz, offset } of TONES) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = hz;
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + TONE_SECONDS);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + TONE_SECONDS);
      }
    },
  };
}
