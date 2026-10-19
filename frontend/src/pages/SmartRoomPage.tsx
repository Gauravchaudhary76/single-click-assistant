import React, { useEffect, useState } from 'react';
import {
  Lightbulb,
  LightbulbOff,
  Wind,
  Sliders,
  AlertCircle,
  Power,
  Sun,
  Home,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { RoomState } from '../types';
import { api } from '../services/api';
import { audio } from '../services/audio';

export const SmartRoomPage: React.FC = () => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRoom = async () => {
    try {
      const data = await api.getRoomState();
      setRoom(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleLight = async () => {
    if (!room) return;
    const newOn = !room.light_on;
    const updated = await api.updateLight(newOn);
    setRoom(updated);
    audio.speak(`The light is now turned ${newOn ? 'ON' : 'OFF'}.`);
  };

  const handleBrightnessChange = async (brightness: number) => {
    if (!room) return;
    const updated = await api.updateLight(undefined, brightness);
    setRoom(updated);
  };

  const handleToggleFan = async () => {
    if (!room) return;
    const newOn = !room.fan_on;
    const newSpeed = newOn ? (room.fan_speed > 0 ? room.fan_speed : 2) : 0;
    const updated = await api.updateFan(newOn, newSpeed);
    setRoom(updated);
    audio.speak(`Fan is now turned ${newOn ? 'ON' : 'OFF'}.`);
  };

  const handleSpeedChange = async (speed: number) => {
    const updated = await api.updateFan(speed > 0, speed);
    setRoom(updated);
    audio.speak(`Fan speed set to level ${speed}.`);
  };

  // Dynamic fan spin CSS animation duration based on speed
  const getFanSpinDuration = (speed: number) => {
    if (speed === 0) return '0s';
    if (speed === 1) return '2.0s';
    if (speed === 2) return '1.2s';
    if (speed === 3) return '0.7s';
    if (speed === 4) return '0.4s';
    if (speed === 5) return '0.2s';
    return '1.0s';
  };

  // Room ambient lighting brightness calculation
  const lightFactor = room?.light_on ? (room.light_brightness / 100) : 0.15;
  const roomBgOpacity = Math.max(0.12, lightFactor);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Prominent Mandatory Safety Disclaimer */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h2 className="font-extrabold text-amber-900 text-sm tracking-wide uppercase">
              SIMULATION MODE — NO PHYSICAL DEVICES CONNECTED
            </h2>
            <p className="text-xs text-amber-800">
              This interactive virtual room simulates IoT appliance feedback for college engineering demonstration.
              No high-voltage relays or electrical circuits are modified.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-full">
          SAFE DEMO
        </span>
      </div>

      {/* Main Grid: Left = Virtual Room Graphic Visualizer, Right = Appliance Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Virtual Room Illustration Visualizer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Home className="w-4 h-4 text-brand-600" />
              Simulated Room Interior View
            </h2>
            <span className="text-xs text-slate-400 font-mono">Real-Time Canvas</span>
          </div>

          {/* Interactive Room Canvas Box */}
          <div
            className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all duration-500 flex items-center justify-center"
            style={{
              backgroundColor: room?.light_on
                ? `rgba(254, 243, 199, ${roomBgOpacity * 1.1})`
                : '#090d16',
              boxShadow: room?.light_on
                ? `inset 0 0 100px rgba(251, 191, 36, ${lightFactor * 0.4})`
                : 'inset 0 0 100px rgba(0, 0, 0, 0.95)'
            }}
          >
            {/* Window with outside daylight / night effect */}
            <div className="absolute top-6 left-8 w-20 h-28 border-4 border-slate-700 bg-slate-900/60 rounded-md overflow-hidden flex flex-col">
              <div className="flex-1 bg-gradient-to-b from-sky-900 to-indigo-950 flex items-center justify-center">
                <span className="text-[10px] text-slate-400 font-bold">Window</span>
              </div>
              <div className="h-0.5 bg-slate-700 w-full" />
              <div className="flex-1 bg-slate-900/80" />
            </div>

            {/* Ceiling Light Bulb Graphic */}
            <div className="absolute top-0 flex flex-col items-center">
              <div className="w-1 h-12 bg-slate-600" />
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  room?.light_on
                    ? 'bg-amber-300 shadow-[0_0_60px_25px_rgba(251,191,36,0.8)] text-amber-900'
                    : 'bg-slate-700 text-slate-400 shadow-none'
                }`}
              >
                <Lightbulb className="w-8 h-8" />
              </div>
            </div>

            {/* Ceiling Fan with Animated Blades */}
            <div className="absolute top-24 right-16 flex flex-col items-center">
              <div className="w-1.5 h-8 bg-slate-600" />
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Center fan hub */}
                <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-600 z-10 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-400" />
                </div>

                {/* 4 Fan Blades rotating */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    animation: room?.fan_on && (room?.fan_speed ?? 0) > 0
                      ? `spin ${getFanSpinDuration(room.fan_speed)} linear infinite`
                      : 'none',
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="absolute w-24 h-4 bg-slate-700 rounded-full shadow-md" />
                  <div className="absolute w-4 h-24 bg-slate-700 rounded-full shadow-md" />
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${room?.fan_on ? 'bg-sky-100 text-sky-800' : 'bg-slate-800 text-slate-400'}`}>
                Fan: {room?.fan_on ? `Level ${room.fan_speed}` : 'Stopped'}
              </span>
            </div>

            {/* Simulated Patient Bed Silhouette */}
            <div className="absolute bottom-4 left-10 w-44 h-14 bg-slate-800/80 rounded-t-lg border-t-2 border-slate-600 flex items-center justify-center text-xs text-slate-300 font-semibold shadow-lg">
              Patient Resting Unit
            </div>

            {/* Ambient Room State Overlay Pill */}
            <div className="absolute bottom-3 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono space-x-3">
              <span>Light: {room?.light_on ? `${room.light_brightness}%` : 'OFF'}</span>
              <span>•</span>
              <span>Fan: {room?.fan_on ? `Spd ${room.fan_speed}` : 'OFF'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            The visualizer reflects changes triggered either by patient eye blinks (through the Eye-Blink Assistant) or via the controls on the right.
          </p>
        </div>

        {/* Appliance Controls Card */}
        <div className="space-y-6">
          {/* Light Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${room?.light_on ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {room?.light_on ? <Lightbulb className="w-6 h-6" /> : <LightbulbOff className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Room Lighting Control</h3>
                  <p className="text-xs text-slate-500">Virtual ambient light and brightness</p>
                </div>
              </div>
              <button
                onClick={handleToggleLight}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 ${
                  room?.light_on
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{room?.light_on ? 'Turn OFF' : 'Turn ON'}</span>
              </button>
            </div>

            {/* Brightness Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Brightness Level
                </span>
                <span className="font-mono font-bold text-amber-600">
                  {room?.light_brightness ?? 80}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                disabled={!room?.light_on}
                value={room?.light_brightness ?? 80}
                onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Dim (10%)</span>
                <span>Normal (50%)</span>
                <span>Max (100%)</span>
              </div>
            </div>
          </div>

          {/* Fan Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${room?.fan_on ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Wind className={`w-6 h-6 ${room?.fan_on ? 'animate-spin-normal' : ''}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Ceiling Fan Control</h3>
                  <p className="text-xs text-slate-500">Virtual airflow and speed regulator</p>
                </div>
              </div>
              <button
                onClick={handleToggleFan}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 ${
                  room?.fan_on
                    ? 'bg-sky-600 hover:bg-sky-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{room?.fan_on ? 'Turn OFF' : 'Turn ON'}</span>
              </button>
            </div>

            {/* Speed Selector Buttons 0 to 5 */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>Fan Speed Level:</span>
                <span className="font-mono font-bold text-sky-600">
                  {room?.fan_on ? `Level ${room.fan_speed} of 5` : 'OFF (Speed 0)'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map((spd) => {
                  const isCurrent = (room?.fan_speed ?? 0) === spd && (spd === 0 ? !room?.fan_on : room?.fan_on);
                  return (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`py-2 rounded-xl font-bold text-xs transition border ${
                        isCurrent
                          ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/30'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {spd === 0 ? 'OFF' : spd}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
