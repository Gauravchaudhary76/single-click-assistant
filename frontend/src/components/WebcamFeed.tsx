import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, AlertCircle, Eye, Activity, RefreshCw } from 'lucide-react';
import { BlinkTelemetry } from '../types';

interface WebcamFeedProps {
  isCameraActive: boolean;
  cameraError: string | null;
  telemetry: BlinkTelemetry;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  earThreshold: number;
}

export const WebcamFeed: React.FC<WebcamFeedProps> = ({
  isCameraActive,
  cameraError,
  telemetry,
  videoRef,
  canvasRef,
  onStartCamera,
  onStopCamera,
  earThreshold
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw landmark points overlay on top of webcam feed
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (telemetry.landmarks_preview && telemetry.landmarks_preview.length > 0) {
      ctx.fillStyle = '#0ea5e9'; // brand sky blue
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      telemetry.landmarks_preview.forEach(([x, y]) => {
        const px = x * canvas.width;
        const py = y * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }, [telemetry.landmarks_preview]);

  const earPercent = Math.min(100, Math.max(0, (telemetry.avg_ear / 0.40) * 100));
  const thresholdPercent = Math.min(100, Math.max(0, (earThreshold / 0.40) * 100));

  let eyeStatusColor = 'bg-slate-100 text-slate-700';
  if (telemetry.eye_status === 'Eyes Open') {
    eyeStatusColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (telemetry.eye_status === 'Eyes Closed') {
    eyeStatusColor = 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
  } else if (telemetry.eye_status === 'Blink Detected') {
    eyeStatusColor = 'bg-brand-100 text-brand-800 border-brand-300 font-bold';
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col space-y-3.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-slate-700" />
          <h2 className="font-bold text-sm text-slate-800">Real-Time Webcam Eye Tracking</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${eyeStatusColor}`}>
            {telemetry.eye_status}
          </span>
          <button
            onClick={isCameraActive ? onStopCamera : onStartCamera}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-sm ${
              isCameraActive
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {isCameraActive ? (
              <>
                <CameraOff className="w-3.5 h-3.5 mr-1" />
                <span>Stop Camera</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 mr-1" />
                <span>Start Camera</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
        {/* Hidden video element used for streaming */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${isCameraActive ? 'block' : 'hidden'}`}
        />

        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Landmark tracking overlay canvas */}
        {isCameraActive && (
          <canvas
            ref={overlayCanvasRef}
            width={320}
            height={240}
            className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
          />
        )}

        {/* Inactive or Error State */}
        {!isCameraActive && (
          <div className="text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CameraOff className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Webcam Inactive</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Click &quot;Start Camera&quot; to begin eye-blink detection, or use Manual Simulation mode.
            </p>
          </div>
        )}

        {/* Live Tracking Crosshairs & Diagnostic Badge */}
        {isCameraActive && (
          <div className="absolute bottom-2 left-2 bg-slate-950/70 backdrop-blur-sm text-[11px] text-white px-2.5 py-1 rounded-md border border-slate-700/60 font-mono space-x-2">
            <span>Face: {telemetry.face_detected ? 'Locked' : 'Searching...'}</span>
            <span>•</span>
            <span>EAR: {telemetry.avg_ear.toFixed(3)}</span>
          </div>
        )}

        {/* Blink Counter in corner */}
        {isCameraActive && (
          <div className="absolute top-2 right-2 bg-slate-950/70 backdrop-blur-sm text-xs text-white px-2.5 py-1 rounded-md border border-slate-700/60 font-semibold flex items-center space-x-1">
            <Eye className="w-3.5 h-3.5 text-brand-400" />
            <span>Blinks: {telemetry.blink_count}</span>
          </div>
        )}
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Camera Access Notice</p>
            <p>{cameraError}</p>
          </div>
        </div>
      )}

      {/* EAR (Eye Aspect Ratio) Live Meter */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-brand-600" />
            Eye Aspect Ratio (EAR) Gauge
          </span>
          <span className="font-mono text-slate-600">
            {telemetry.avg_ear.toFixed(3)} <span className="text-slate-400">(Threshold: {earThreshold.toFixed(2)})</span>
          </span>
        </div>

        {/* Progress Bar with Threshold Marker */}
        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              telemetry.avg_ear < earThreshold
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${earPercent}%` }}
          />
          {/* Threshold indicator line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-10"
            style={{ left: `${thresholdPercent}%` }}
            title={`Threshold: ${earThreshold}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>0.00 (Closed)</span>
          <span className="text-red-600 font-semibold">▲ Threshold ({earThreshold.toFixed(2)})</span>
          <span>0.40 (Wide Open)</span>
        </div>
      </div>
    </div>
  );
};
