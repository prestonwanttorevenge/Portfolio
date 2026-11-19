import React from 'react';
import { FastForward, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface CornerControlsProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  isComplete: boolean;
  onBuildAll: () => void;
  onReplay: () => void;
}

export const CornerControls: React.FC<CornerControlsProps> = ({
  soundEnabled,
  onToggleSound,
  isComplete,
  onBuildAll,
  onReplay,
}) => {
  return (
    <div className="corner-controls">
      <button
        type="button"
        className={`ctrl-btn${soundEnabled ? ' active' : ''}`}
        onClick={onToggleSound}
        title={soundEnabled ? 'Mute sound effects' : 'Enable Web Audio sound effects'}
        aria-label="Toggle sound effects"
      >
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span>SFX</span>
      </button>

      {!isComplete ? (
        <button
          type="button"
          className="ctrl-btn primary"
          onClick={onBuildAll}
          title="Finish all builds immediately"
        >
          <FastForward size={14} />
          <span>Build All</span>
        </button>
      ) : (
        <button
          type="button"
          className="ctrl-btn primary"
          onClick={onReplay}
          title="Replay swarm construction from the top"
        >
          <RotateCcw size={14} />
          <span>Replay</span>
        </button>
      )}
    </div>
  );
};
