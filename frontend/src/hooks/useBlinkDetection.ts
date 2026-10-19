import { useState, useRef, useEffect, useCallback } from 'react';
import { BlinkTelemetry, MenuState } from '../types';
import { api } from '../services/api';
import { audio } from '../services/audio';

interface UseBlinkDetectionProps {
  onMenuUpdate?: (menuState: MenuState) => void;
  onActionResult?: (actionResult: any) => void;
  onGesture?: (gesture: string) => void;
  earThreshold?: number;
}

export function useBlinkDetection({
  onMenuUpdate,
  onActionResult,
  onGesture,
}: UseBlinkDetectionProps = {}) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<BlinkTelemetry>({
    face_detected: false,
    left_ear: 0.0,
    right_ear: 0.0,
    avg_ear: 0.0,
    eye_status: 'Camera Offline',
    blink_count: 0
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      window.cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setTelemetry(prev => ({ ...prev, eye_status: 'Camera Stopped' }));
  }, []);

  // Frame processing loop
  const processFrameLoop = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA && !inFlightRef.current) {
      inFlightRef.current = true;
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 320;
          canvas.height = 240;
          ctx.drawImage(video, 0, 0, 320, 240);
          const b64 = canvas.toDataURL('image/jpeg', 0.65);

          const result = await api.processFrame(b64);
          setTelemetry({
            face_detected: result.face_detected,
            left_ear: result.left_ear,
            right_ear: result.right_ear,
            avg_ear: result.avg_ear,
            eye_status: result.eye_status,
            blink_count: result.blink_count,
            gesture_detected: result.gesture_detected,
            gesture_description: result.gesture_description,
            duration_ms: result.duration_ms,
            landmarks_preview: result.landmarks_preview
          });

          if (result.gesture_detected) {
            onGesture?.(result.gesture_detected);
            if (result.gesture_detected === 'NEXT') {
              audio.playNavigationTick();
            } else if (result.gesture_detected === 'SELECT') {
              audio.playSelectChime();
            }
          }

          if (result.menu_state) {
            onMenuUpdate?.(result.menu_state);
          }

          if (result.action_result) {
            onActionResult?.(result.action_result);
            if (result.action_result.speech) {
              audio.speak(result.action_result.speech);
            }
          }
        }
      } catch (err) {
        // Backend frame process error handling
      } finally {
        inFlightRef.current = false;
      }
    }

    loopRef.current = window.setTimeout(processFrameLoop, 75); // ~13 fps for smooth responsive detection
  }, [onGesture, onMenuUpdate, onActionResult]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam mediaDevices API is not supported in this browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          setTelemetry(prev => ({ ...prev, eye_status: 'Detecting...' }));
          processFrameLoop();
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera permissions in your browser or use Manual Simulation mode.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this computer. Use Manual Simulation mode for testing.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [processFrameLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Manual gesture triggers (for demonstration mode or simulation)
  const simulateGesture = useCallback(async (gesture: 'NEXT' | 'SELECT' | 'CANCEL' | 'EMERGENCY') => {
    try {
      const res = await api.simulateGesture(gesture);
      if (gesture === 'NEXT') {
        audio.playNavigationTick();
      } else if (gesture === 'SELECT') {
        audio.playSelectChime();
      } else if (gesture === 'EMERGENCY') {
        audio.startEmergencySiren();
      }

      onGesture?.(gesture);
      if (res.menu_state) {
        onMenuUpdate?.(res.menu_state);
      }
      if (res.action_result) {
        onActionResult?.(res.action_result);
        if (res.action_result.speech) {
          audio.speak(res.action_result.speech);
        }
      }
      return res;
    } catch (err) {
      console.error('Simulation error:', err);
    }
  }, [onGesture, onMenuUpdate, onActionResult]);

  return {
    isCameraActive,
    cameraError,
    telemetry,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    simulateGesture
  };
}
