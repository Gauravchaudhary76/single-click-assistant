import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Contrast,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { audio } from '../services/audio';

interface HeaderProps {
  lastSpokenText: string | null;
  emergencyCount: number;
  onNavigateToCaregiver: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  onSeedDemo: () => void;
  onResetDemo: () => void;
  demoMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lastSpokenText,
  emergencyCount,
  onNavigateToCaregiver,
  highContrast,
  onToggleHighContrast,
  onSeedDemo,
  onResetDemo,
  demoMode
}) => {
  const [speechMuted, setSpeechMuted] = useState(!audio.speechEnabled);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleMute = () => {
    const newState = !speechMuted;
    setSpeechMuted(newState);
    audio.speechEnabled = !newState;
    audio.audioAlertsEnabled = !newState;
    if (!newState) {
      audio.speak("Voice feedback enabled.");
    }
  };

  const handleResetClick = () => {
    if (confirmReset) {
      onResetDemo();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      {/* Emergency Flash Banner */}
      {emergencyCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between animate-emergency-flash shadow-md">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
            <span className="font-bold text-sm tracking-wide">
              EMERGENCY ASSISTANCE ACTIVE: {emergencyCount} Unacknowledged Urgent Alert{emergencyCount > 1 ? 's' : ''}!
            </span>
          </div>
          <button
            onClick={onNavigateToCaregiver}
            className="bg-white text-red-700 px-3.5 py-1 rounded-lg text-xs font-bold hover:bg-red-50 transition shadow-sm"
          >
            Open Caregiver Dashboard →
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="px-6 py-3.5 flex items-center justify-between">
        {/* Left: Voice Subtitle Feedback Banner */}
        <div className="flex items-center space-x-3 flex-1 max-w-2xl">
          <div className="flex items-center space-x-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200 text-xs w-full">
            <span className="flex items-center gap-1 font-semibold text-slate-700 flex-shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-brand-600" />
              Spoken:
            </span>
            <span className="text-slate-600 truncate font-mono">
              {lastSpokenText ? `"${lastSpokenText}"` : 'System ready. Waiting for user interaction.'}
            </span>
          </div>
        </div>

        {/* Right Header Quick Controls */}
        <div className="flex items-center space-x-2">
          {/* Demo Data Seed / Reset Button */}
          {demoMode && (
            <div className="flex items-center space-x-1.5 mr-2">
              <button
                onClick={onSeedDemo}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                title="Populate realistic demonstration dataset"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Seed Demo Data</span>
              </button>
              <button
                onClick={handleResetClick}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                  confirmReset
                    ? 'bg-red-600 text-white border-red-700 font-bold'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Reset demo data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{confirmReset ? 'Confirm Reset?' : 'Reset Demo'}</span>
              </button>
            </div>
          )}

          {/* Mute Voice Feedback */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg border transition ${
              speechMuted
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title={speechMuted ? 'Unmute voice feedback' : 'Mute voice feedback'}
          >
            {speechMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={onToggleHighContrast}
            className={`p-2 rounded-lg border transition ${
              highContrast
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle High Contrast for low-vision accessibility"
          >
            <Contrast className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
