import React, { useEffect, useState, useCallback } from 'react';
import {
  Droplets,
  Utensils,
  AlertCircle,
  Bath,
  HelpCircle,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Lightbulb,
  LightbulbOff,
  Wind,
  Sliders,
  Sparkles,
  Volume2,
  Check,
  X,
  Keyboard,
  RotateCcw
} from 'lucide-react';
import { MenuItem, MenuState, BlinkTelemetry } from '../types';
import { WebcamFeed } from '../components/WebcamFeed';
import { CalibrationModal } from '../components/CalibrationModal';
import { audio } from '../services/audio';
import { api } from '../services/api';

interface EyeBlinkAssistantPageProps {
  telemetry: BlinkTelemetry;
  isCameraActive: boolean;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onSimulateGesture: (gesture: string) => void;
  menuState: MenuState | null;
  onMenuStateChange: (state: MenuState) => void;
  earThreshold: number;
  onEarThresholdChange: (newThreshold: number) => void;
}

const ICON_MAP: Record<string, any> = {
  water: Droplets,
  food: Utensils,
  pain: AlertCircle,
  washroom: Bath,
  help: HelpCircle,
  emergency: AlertTriangle,
  music_play: Play,
  music_pause: Pause,
  music_resume: Play,
  music_stop: Square,
  light_on: Lightbulb,
  light_off: LightbulbOff,
  fan_increase: Wind,
  fan_decrease: Wind,
};

export const EyeBlinkAssistantPage: React.FC<EyeBlinkAssistantPageProps> = ({
  telemetry,
  isCameraActive,
  cameraError,
  videoRef,
  canvasRef,
  onStartCamera,
  onStopCamera,
  onSimulateGesture,
  menuState,
  onMenuStateChange,
  earThreshold,
  onEarThresholdChange
}) => {
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);

  // Initialize menu if null
  useEffect(() => {
    if (!menuState) {
      api.getMenu().then(onMenuStateChange).catch(console.error);
    }
  }, [menuState, onMenuStateChange]);

  // Keyboard accessibility controls (ArrowRight/Space = Next, Enter = Select, Esc = Cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        onSimulateGesture('NEXT');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSimulateGesture('SELECT');
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onSimulateGesture('CANCEL');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSimulateGesture]);

  const currentItem = menuState?.current_item;
  const flatItems = menuState?.flat_items || [];
  const pendingConfirm = menuState?.pending_confirmation;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header / Mode Notice */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Eye-Blink Assistant Interface</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              Interactive Menu
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hands-free patient menu. Gestures detected via webcam or manual simulation below.
          </p>
        </div>

        {/* Calibration button */}
        <button
          onClick={() => setIsCalibrationOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
        >
          <Sliders className="w-4 h-4 text-brand-600" />
          <span>Calibrate Blink Thresholds</span>
        </button>
      </div>

      {/* Emergency Confirmation Banner if pending */}
      {pendingConfirm && (
        <div className="bg-red-600 text-white rounded-2xl p-5 border-2 border-red-700 shadow-xl flex items-center justify-between animate-emergency-flash">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-white animate-bounce" />
            <div>
              <h2 className="font-extrabold text-base tracking-wide">
                CONFIRM EMERGENCY ASSISTANCE
              </h2>
              <p className="text-xs text-red-100">
                {pendingConfirm.prompt}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSimulateGesture('SELECT')}
              className="bg-white text-red-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-50 transition shadow-md"
            >
              Confirm Emergency (Select)
            </button>
            <button
              onClick={() => onSimulateGesture('CANCEL')}
              className="bg-red-800 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-900 transition"
            >
              Cancel (Long Blink)
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Blink Controlled Menu, Right = Webcam Feed & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Large Accessible Eye-Blink Menu */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['ALL', 'NEEDS', 'EMERGENCY', 'SMART ROOM', 'ENTERTAINMENT'].map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-300'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Active Highlight Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-brand-400 font-semibold">
                Current Highlighted Item
              </span>
              <h2 className="text-xl font-black text-white">
                {currentItem ? currentItem.label : 'Loading Menu...'}
              </h2>
              <p className="text-xs text-slate-300">
                Category: <span className="font-semibold text-sky-200">{currentItem?.category}</span> • Item {(menuState?.active_index ?? 0) + 1} of {flatItems.length}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSimulateGesture('SELECT')}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-xs text-white shadow-md transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Execute Now</span>
              </button>
              <div className="flex items-center space-x-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block mr-1"></span>
                <span className="text-xs font-mono font-bold text-emerald-300">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {flatItems
              .map((item, originalIdx) => ({ item, originalIdx }))
              .filter(({ item }) => activeCategory === 'ALL' || item.category.toUpperCase() === activeCategory)
              .map(({ item, originalIdx }) => {
                const isSelected = menuState?.active_index === originalIdx;
                const Icon = ICON_MAP[item.id] || HelpCircle;
                const isEmergency = item.is_emergency;

                let cardStyle = 'bg-white border-slate-200 hover:border-slate-300 text-slate-800';
                if (isSelected) {
                  if (isEmergency) {
                    cardStyle = 'bg-red-50 border-red-500 shadow-lg shadow-red-500/20 ring-4 ring-red-400/30 text-red-950 scale-[1.02]';
                  } else {
                    cardStyle = 'bg-brand-50/80 border-brand-500 shadow-lg shadow-brand-500/20 ring-4 ring-brand-400/30 text-brand-950 scale-[1.02]';
                  }
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isSelected) {
                        onSimulateGesture('SELECT');
                      } else {
                        onSimulateGesture(`SET_INDEX:${originalIdx}`);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center space-x-4 ${cardStyle}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        isSelected
                          ? isEmergency
                            ? 'bg-red-600 text-white'
                            : 'bg-brand-600 text-white'
                          : isEmergency
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.category}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-600 text-white uppercase">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm truncate mt-0.5">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {isSelected ? 'Medium blink or click to execute' : 'Click to jump or short blink'}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Gesture Instruction Guide */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Eye-Blink Gesture Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Short Blink (150-650ms)</p>
                <p className="text-slate-500 mt-1">Moves highlight to the next menu item.</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-brand-700">Medium Blink (700-1800ms)</p>
                <p className="text-slate-500 mt-1">Selects & executes highlighted item.</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-rose-700">Long Closure (2000ms+)</p>
                <p className="text-slate-500 mt-1">Cancels confirmation or resets menu.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Webcam Feed & Manual Simulation Controls */}
        <div className="space-y-4">
          <WebcamFeed
            isCameraActive={isCameraActive}
            cameraError={cameraError}
            telemetry={telemetry}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onStartCamera={onStartCamera}
            onStopCamera={onStopCamera}
            earThreshold={earThreshold}
          />

          {/* Manual Simulation Controls Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-brand-600" />
                Manual Simulation Controls
              </h2>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Demo Friendly
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Trigger gestures manually without a camera or use keyboard shortcuts (Space / Enter / Esc).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onSimulateGesture('NEXT')}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-800 border border-slate-200 transition shadow-sm"
              >
                Next Item <span className="text-[10px] text-slate-400 block font-normal">(Space / →)</span>
              </button>
              <button
                onClick={() => onSimulateGesture('SELECT')}
                className="px-3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 font-bold text-xs text-white shadow-sm transition"
              >
                Select Item <span className="text-[10px] text-brand-200 block font-normal">(Enter)</span>
              </button>
              <button
                onClick={() => onSimulateGesture('CANCEL')}
                className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 font-bold text-xs text-rose-700 border border-rose-200 transition"
              >
                Cancel / Reset <span className="text-[10px] text-rose-400 block font-normal">(Esc)</span>
              </button>
            </div>

            {/* Direct Quick Triggers */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500">Direct Assistance Triggers:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <button
                  onClick={async () => {
                    await api.createRequest('water');
                    audio.speak('Your request for water has been recorded.');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
                >
                  💧 Water
                </button>
                <button
                  onClick={async () => {
                    await api.createRequest('food');
                    audio.speak('Your request for food has been recorded.');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 font-medium text-slate-700"
                >
                  🍲 Food
                </button>
                <button
                  onClick={async () => {
                    await api.createRequest('pain');
                    audio.speak('Pain or discomfort alert recorded.');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-amber-50 hover:bg-amber-100 font-medium text-amber-800 border border-amber-200"
                >
                  ⚠️ Pain
                </button>
                <button
                  onClick={async () => {
                    await api.createRequest('emergency');
                    audio.startEmergencySiren();
                    audio.speak('EMERGENCY ASSISTANCE REQUESTED!');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-red-600 hover:bg-red-700 font-bold text-white shadow-sm"
                >
                  🚨 Emergency SOS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calibration Wizard Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentAvgEar={telemetry.avg_ear}
        faceDetected={telemetry.face_detected}
        onCalibrationComplete={onEarThresholdChange}
      />
    </div>
  );
};
