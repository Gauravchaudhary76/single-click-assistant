import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, Eye, ShieldCheck, X, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { audio } from '../services/audio';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvgEar: number;
  faceDetected: boolean;
  onCalibrationComplete: (newThreshold: number) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentAvgEar,
  faceDetected,
  onCalibrationComplete
}) => {
  const [step, setStep] = useState<number>(1);
  const [openEyeSamples, setOpenEyeSamples] = useState<number[]>([]);
  const [closedEyeSamples, setClosedEyeSamples] = useState<number[]>([]);
  const [recording, setRecording] = useState<boolean>(false);
  const [calculatedThreshold, setCalculatedThreshold] = useState<number>(0.22);
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setOpenEyeSamples([]);
      setClosedEyeSamples([]);
      setRecording(false);
    }
  }, [isOpen]);

  // Record samples in step 2 (open eyes)
  useEffect(() => {
    let interval: any = null;
    if (step === 2 && recording) {
      interval = setInterval(() => {
        if (currentAvgEar > 0.15) {
          setOpenEyeSamples(prev => [...prev, currentAvgEar]);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [step, recording, currentAvgEar]);

  // Record samples in step 3 (natural blinks)
  useEffect(() => {
    let interval: any = null;
    if (step === 3 && recording) {
      interval = setInterval(() => {
        if (currentAvgEar > 0.05) {
          setClosedEyeSamples(prev => [...prev, currentAvgEar]);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [step, recording, currentAvgEar]);

  if (!isOpen) return null;

  const startOpenEyeCapture = () => {
    setOpenEyeSamples([]);
    setRecording(true);
    setCountdown(3);
    audio.speak("Look directly at the camera with eyes open naturally.");

    let timer = 3;
    const cd = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer <= 0) {
        clearInterval(cd);
        setRecording(false);
        setStep(3);
        audio.speak("Baseline captured. Now please blink naturally five times.");
      }
    }, 1000);
  };

  const startBlinkCapture = () => {
    setClosedEyeSamples([]);
    setRecording(true);
    setCountdown(5);

    let timer = 5;
    const cd = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer <= 0) {
        clearInterval(cd);
        setRecording(false);

        // Compute threshold
        const avgOpen = openEyeSamples.length > 0
          ? openEyeSamples.reduce((a, b) => a + b, 0) / openEyeSamples.length
          : 0.32;

        const minClosed = closedEyeSamples.length > 0
          ? Math.min(...closedEyeSamples)
          : 0.14;

        // Optimal threshold midpoint with slight bias towards closed state
        const calculated = Math.round(((avgOpen * 0.45) + (minClosed * 0.55)) * 100) / 100;
        const clamped = Math.max(0.16, Math.min(0.30, calculated));

        setCalculatedThreshold(clamped);
        setStep(4);
        audio.speak(`Calibration calculated. Recommended eye closure threshold is ${clamped}.`);
      }
    }, 1000);
  };

  const handleApplyThreshold = async () => {
    try {
      await api.updateSettings({ ear_threshold: calculatedThreshold });
      onCalibrationComplete(calculatedThreshold);
      audio.speak("New calibration profile applied successfully.");
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Guided Blink Calibration</h3>
              <p className="text-xs text-slate-500">Tune detection for your facial geometry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between px-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === s
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                    : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 5 && (
                <div className={`w-8 h-0.5 mx-1 ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[140px] flex flex-col justify-center text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
          {step === 1 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Step 1: Position Your Face</h4>
              <p className="text-xs text-slate-600">
                Sit comfortably facing your webcam in standard room lighting.
              </p>
              <div className="inline-flex items-center space-x-2 mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200">
                <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>Face Status: {faceDetected ? 'Detected and Centered' : 'Please look towards webcam'}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Step 2: Measure Open Eyes Baseline</h4>
              <p className="text-xs text-slate-600">
                Keep your eyes open naturally while we measure your resting EAR.
              </p>
              {recording ? (
                <div className="text-brand-600 font-bold text-xl py-2 animate-pulse">
                  Measuring... {countdown}s
                </div>
              ) : (
                <p className="text-xs text-slate-400">Click &quot;Capture Open Eyes&quot; when ready</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Step 3: Natural Blink Measurement</h4>
              <p className="text-xs text-slate-600">
                Blink naturally 4 to 5 times to register your eye-closure depth.
              </p>
              {recording ? (
                <div className="text-brand-600 font-bold text-xl py-2 animate-pulse">
                  Blink naturally... {countdown}s
                </div>
              ) : (
                <p className="text-xs text-slate-400">Click &quot;Start Blink Capture&quot; when ready</p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Step 4: Calibration Computed</h4>
              <p className="text-xs text-slate-600">
                Based on your eye geometry samples, here is your customized EAR threshold:
              </p>
              <div className="text-2xl font-mono font-bold text-brand-600 py-1">
                {calculatedThreshold.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400">
                Values below this will register as intentional closure.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Step 5: Test and Verify</h4>
              <p className="text-xs text-slate-600">
                Blink now and observe if status changes to &quot;Eyes Closed&quot; accurately.
              </p>
              <div className="text-sm font-semibold text-slate-700 py-1">
                Current Live EAR: <span className="font-mono text-brand-600">{currentAvgEar.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!faceDetected}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm"
            >
              Next: Measure Eyes →
            </button>
          )}

          {step === 2 && (
            <button
              onClick={startOpenEyeCapture}
              disabled={recording}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm"
            >
              {recording ? 'Capturing...' : 'Capture Open Eyes'}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={startBlinkCapture}
              disabled={recording}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition shadow-sm"
            >
              {recording ? 'Recording Blinks...' : 'Start Blink Capture'}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition shadow-sm"
            >
              Test Configuration →
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleApplyThreshold}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
            >
              Apply & Save Calibration
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
