import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Volume2,
  Clock,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  Check,
  Eye,
  Camera,
  Activity,
  Contrast
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';
import { audio } from '../services/audio';
import { CalibrationModal } from '../components/CalibrationModal';

interface SettingsPageProps {
  currentEarThreshold: number;
  onEarThresholdChange: (val: number) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onSeedDemo: () => void;
  onResetDemo: () => void;
  currentAvgEar: number;
  faceDetected: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentEarThreshold,
  onEarThresholdChange,
  highContrast,
  onToggleHighContrast,
  demoMode,
  onToggleDemoMode,
  onSeedDemo,
  onResetDemo,
  currentAvgEar,
  faceDetected
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  useEffect(() => {
    api.getSettings().then(data => {
      setSettings(data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleUpdate = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    try {
      const updated = await api.updateSettings(updates);
      setSettings(updated);
      if (updates.ear_threshold !== undefined) {
        onEarThresholdChange(updates.ear_threshold);
      }
      if (updates.speech_enabled !== undefined) {
        audio.speechEnabled = updates.speech_enabled;
      }
      if (updates.speech_rate !== undefined) {
        audio.speechRate = updates.speech_rate;
      }
      if (updates.speech_volume !== undefined) {
        audio.speechVolume = updates.speech_volume;
      }
      if (updates.audio_alerts_enabled !== undefined) {
        audio.audioAlertsEnabled = updates.audio_alerts_enabled;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-600" />
            System Configuration & Calibration
          </h1>
          <p className="text-xs text-slate-500">
            Tune computer vision sensitivity, gesture durations, text-to-speech parameters, and escalation rules.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </span>
        )}
      </div>

      {/* Calibration Quick Launcher Card */}
      <div className="bg-gradient-to-r from-brand-600 to-sky-700 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Adaptive Personalization</span>
          </div>
          <h3 className="text-base font-bold">5-Step Guided Blink Calibration Wizard</h3>
          <p className="text-xs text-sky-100 max-w-md">
            Automatically calculates custom EAR threshold and blink depth specific to your eyes and ambient lighting.
          </p>
        </div>
        <button
          onClick={() => setIsCalibrationOpen(true)}
          className="bg-white text-brand-700 hover:bg-sky-50 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 flex-shrink-0"
        >
          <Sliders className="w-4 h-4 text-brand-600" />
          <span>Launch Wizard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Computer Vision & Blink Sensitivity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Eye className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-800 text-sm">Computer Vision Sensitivity</h3>
          </div>

          {/* EAR Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Eye Aspect Ratio (EAR) Threshold</span>
              <span className="font-mono font-bold text-brand-600">
                {currentEarThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.32"
              step="0.01"
              value={currentEarThreshold}
              onChange={(e) => handleUpdate({ ear_threshold: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.15 (Strict closure)</span>
              <span>0.22 (Standard default)</span>
              <span>0.32 (Sensitive)</span>
            </div>
          </div>

          {/* Gesture Timings */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">Gesture Duration Windows (ms)</h4>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Short Blink (Next Item) Max:</span>
                <span className="font-mono font-semibold">{settings?.short_blink_max_ms ?? 650}ms</span>
              </div>
              <input
                type="range"
                min="400"
                max="800"
                step="50"
                value={settings?.short_blink_max_ms ?? 650}
                onChange={(e) => handleUpdate({ short_blink_max_ms: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Medium Blink (Select Item) Max:</span>
                <span className="font-mono font-semibold">{settings?.medium_blink_max_ms ?? 1800}ms</span>
              </div>
              <input
                type="range"
                min="1200"
                max="2400"
                step="100"
                value={settings?.medium_blink_max_ms ?? 1800}
                onChange={(e) => handleUpdate({ medium_blink_max_ms: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Debounce Neutral Cooldown:</span>
                <span className="font-mono font-semibold">{settings?.debounce_ms ?? 400}ms</span>
              </div>
              <input
                type="range"
                min="200"
                max="800"
                step="50"
                value={settings?.debounce_ms ?? 400}
                onChange={(e) => handleUpdate({ debounce_ms: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Voice Feedback & Audio Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Volume2 className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-800 text-sm">Voice Assistant & Audio</h3>
          </div>

          {/* Voice Feedback Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 text-xs">Spoken TTS Feedback</p>
              <p className="text-[11px] text-slate-500">Reads highlighted menu items and confirmations</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.speech_enabled ?? true}
              onChange={(e) => handleUpdate({ speech_enabled: e.target.checked })}
              className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
          </div>

          {/* Speech Rate */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Speech Rate Speed</span>
              <span className="font-mono font-bold text-brand-600">
                {(settings?.speech_rate ?? 1.0).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.1"
              value={settings?.speech_rate ?? 1.0}
              onChange={(e) => handleUpdate({ speech_rate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* Audio Chimes Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="font-semibold text-slate-800 text-xs">Audio Chimes & Siren</p>
              <p className="text-[11px] text-slate-500">Navigation ticks and emergency siren buzzer</p>
            </div>
            <input
              type="checkbox"
              checked={settings?.audio_alerts_enabled ?? true}
              onChange={(e) => handleUpdate({ audio_alerts_enabled: e.target.checked })}
              className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
          </div>

          {/* Emergency Escalation Timeout */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Emergency Escalation Timeout
              </span>
              <span className="font-mono font-bold text-amber-700">
                {settings?.emergency_escalation_timeout_sec ?? 60} seconds
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleUpdate({ emergency_escalation_timeout_sec: sec })}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    (settings?.emergency_escalation_timeout_sec ?? 60) === sec
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demonstration & Accessibility Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm">Demonstration & Presentation Tools</h3>
        <p className="text-xs text-slate-500">
          Tools designed specifically for college project presentation and examiner inspection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Seed Demo Data */}
          <button
            onClick={onSeedDemo}
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition space-y-1"
          >
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Seed Demo Data</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Populates realistic requests, room state, and events for a college presentation.
            </p>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetDemo}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition space-y-1"
          >
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>Reset Demo Data</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Clears demonstration seed records and restores clean database state.
            </p>
          </button>

          {/* High Contrast Mode */}
          <button
            onClick={onToggleHighContrast}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition space-y-1"
          >
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
              <Contrast className="w-4 h-4 text-slate-600" />
              <span>High Contrast Mode: {highContrast ? 'ON' : 'OFF'}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Enhances UI contrast and font legibility for low-vision patients.
            </p>
          </button>
        </div>
      </div>

      {/* Guided Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentAvgEar={currentAvgEar}
        faceDetected={faceDetected}
        onCalibrationComplete={(newTh) => {
          handleUpdate({ ear_threshold: newTh });
        }}
      />
    </div>
  );
};
