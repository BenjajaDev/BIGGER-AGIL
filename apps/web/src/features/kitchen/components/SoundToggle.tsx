import { Volume2, VolumeOff } from 'lucide-react';
import styles from './SoundToggle.module.css';

export function SoundToggle({ soundOn, onToggle }: { soundOn: boolean; onToggle: () => void }) {
  const Icon = soundOn ? Volume2 : VolumeOff;
  return (
    <button type="button" aria-pressed={soundOn} className={styles.toggle} onClick={onToggle}>
      <Icon size={20} aria-hidden="true" />
      {soundOn ? 'Sonido activado' : 'Sonido apagado'}
    </button>
  );
}
