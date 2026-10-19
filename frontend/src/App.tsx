import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { EyeBlinkAssistantPage } from './pages/EyeBlinkAssistantPage';
import { SmartRoomPage } from './pages/SmartRoomPage';
import { CaregiverAlertsPage } from './pages/CaregiverAlertsPage';
import { ActivityHistoryPage } from './pages/ActivityHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useBlinkDetection } from './hooks/useBlinkDetection';
import { MenuState } from './types';
import { audio } from './services/audio';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);
  const [emergencyCount, setEmergencyCount] = useState<number>(0);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [earThreshold, setEarThreshold] = useState<number>(0.22);
  const [systemStatus, setSystemStatus] = useState<string>('Operational');

  // Register speech subtitle listener
  useEffect(() => {
    audio.onSpeechSubtitle = (text: string) => {
      setLastSpokenText(text);
    };
  }, []);

  // Fetch initial settings & emergency alerts
  useEffect(() => {
    api.getHealth().then(h => {
      setSystemStatus(h.status === 'online' ? 'Operational' : 'Degraded');
    }).catch(() => setSystemStatus('Offline'));

    api.getSettings().then(s => {
      setEarThreshold(s.ear_threshold);
      setDemoMode(s.demo_mode);
      setHighContrast(s.high_contrast_mode);
      audio.speechEnabled = s.speech_enabled;
      audio.speechRate = s.speech_rate;
      audio.speechVolume = s.speech_volume;
      audio.audioAlertsEnabled = s.audio_alerts_enabled;
    }).catch(console.error);

    const checkAlerts = async () => {
      try {
        const data = await api.getCaregiverAlerts();
        setEmergencyCount(data.emergency_count);
        if (data.emergency_count > 0 && !audio.isMusicActive()) {
          audio.startEmergencySiren();
        } else if (data.emergency_count === 0) {
          audio.stopEmergencySiren();
        }
      } catch (e) {}
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 2500);
    return () => clearInterval(interval);
  }, []);

  // Action result handler for menu executions
  const handleActionResult = useCallback((result: any) => {
    if (result.type === 'music_action') {
      if (result.command === 'play' || result.command === 'resume') {
        audio.playMusic();
      } else if (result.command === 'pause') {
        audio.pauseMusic();
      } else if (result.command === 'stop') {
        audio.stopMusic();
      }
    }
  }, []);

  // Gesture detected callback
  const handleGesture = useCallback((gesture: string) => {
    // Optional toast or feedback
  }, []);

  // Hook for webcam blink detection
  const {
    isCameraActive,
    cameraError,
    telemetry,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    simulateGesture
  } = useBlinkDetection({
    onMenuUpdate: setMenuState,
    onActionResult: handleActionResult,
    onGesture: handleGesture,
    earThreshold: earThreshold
  });

  const handleSeedDemo = async () => {
    await api.seedDemo();
    setDemoMode(true);
    audio.speak("Demonstration dataset seeded.");
  };

  const handleResetDemo = async () => {
    await api.resetDemo();
    setDemoMode(false);
    audio.speak("Demonstration data reset to clean state.");
  };

  const handleToggleDemoMode = async () => {
    const newMode = !demoMode;
    setDemoMode(newMode);
    await api.updateSettings({ demo_mode: newMode });
    audio.speak(newMode ? "Manual demonstration mode activated." : "Webcam blink detection mode activated.");
  };

  const handleToggleHighContrast = async () => {
    const newContrast = !highContrast;
    setHighContrast(newContrast);
    await api.updateSettings({ high_contrast_mode: newContrast });
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${highContrast ? 'high-contrast' : 'bg-slate-50'}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        systemStatus={systemStatus}
        isCameraActive={isCameraActive}
        demoMode={demoMode}
        onToggleDemoMode={handleToggleDemoMode}
        emergencyCount={emergencyCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          lastSpokenText={lastSpokenText}
          emergencyCount={emergencyCount}
          onNavigateToCaregiver={() => setCurrentTab('caregiver')}
          highContrast={highContrast}
          onToggleHighContrast={handleToggleHighContrast}
          onSeedDemo={handleSeedDemo}
          onResetDemo={handleResetDemo}
          demoMode={demoMode}
        />

        {/* Tab View Container */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onStartAssistant={() => {
                setCurrentTab('assistant');
                if (!isCameraActive && !demoMode) {
                  startCamera();
                }
              }}
              onNavigateTab={setCurrentTab}
              isCameraActive={isCameraActive}
            />
          )}

          {currentTab === 'assistant' && (
            <EyeBlinkAssistantPage
              telemetry={telemetry}
              isCameraActive={isCameraActive}
              cameraError={cameraError}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onStartCamera={startCamera}
              onStopCamera={stopCamera}
              onSimulateGesture={simulateGesture}
              menuState={menuState}
              onMenuStateChange={setMenuState}
              earThreshold={earThreshold}
              onEarThresholdChange={setEarThreshold}
            />
          )}

          {currentTab === 'smart-room' && <SmartRoomPage />}

          {currentTab === 'caregiver' && <CaregiverAlertsPage />}

          {currentTab === 'history' && <ActivityHistoryPage />}

          {currentTab === 'settings' && (
            <SettingsPage
              currentEarThreshold={earThreshold}
              onEarThresholdChange={setEarThreshold}
              highContrast={highContrast}
              onToggleHighContrast={handleToggleHighContrast}
              demoMode={demoMode}
              onToggleDemoMode={handleToggleDemoMode}
              onSeedDemo={handleSeedDemo}
              onResetDemo={handleResetDemo}
              currentAvgEar={telemetry.avg_ear}
              faceDetected={telemetry.face_detected}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
