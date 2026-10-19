import React from 'react';
import {
  LayoutDashboard,
  Eye,
  Home,
  Bell,
  History,
  Settings,
  Activity,
  Camera,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  systemStatus: string;
  isCameraActive: boolean;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  emergencyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  systemStatus,
  isCameraActive,
  demoMode,
  onToggleDemoMode,
  emergencyCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'Eye-Blink Assistant', icon: Eye, badge: isCameraActive ? 'LIVE' : undefined },
    { id: 'smart-room', label: 'Smart Room', icon: Home },
    {
      id: 'caregiver',
      label: 'Caregiver Alerts',
      icon: Bell,
      badge: emergencyCount > 0 ? `${emergencyCount} SOS` : undefined,
      badgeColor: 'bg-red-500 text-white animate-pulse'
    },
    { id: 'history', label: 'Activity History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800 shadow-xl flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white leading-tight">
              Single-Click Assistant
            </h1>
            <p className="text-[11px] text-brand-300 font-medium">
              Eye-Blink Smart Assistance
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-brand-500/20 text-brand-300 border border-brand-400/30'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mode Switcher & Status Pill Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
        {/* Interaction Mode Toggle */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300">Mode:</span>
            <button
              onClick={onToggleDemoMode}
              className="flex items-center text-xs text-brand-300 hover:text-brand-200 font-semibold focus:outline-none"
              title="Toggle between real webcam detection and manual simulation"
            >
              {demoMode ? (
                <>
                  <ToggleRight className="w-5 h-5 text-amber-400 inline mr-1" />
                  <span className="text-amber-400">Manual Demo</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-emerald-400 inline mr-1" />
                  <span className="text-emerald-400">Webcam Live</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            {demoMode
              ? 'Simulation active: use keyboard or on-screen buttons.'
              : 'Real computer vision: webcam detects intentional eye blinks.'}
          </p>
        </div>

        {/* Live Diagnostics */}
        <div className="space-y-1.5 text-xs text-slate-400 px-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              System
            </span>
            <span className="text-slate-200 font-medium">{systemStatus}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3 h-3 text-slate-400" />
              Camera
            </span>
            <span className={isCameraActive ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
              {isCameraActive ? 'Streaming' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Engineering project attribution */}
        <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-800/60">
          <p className="font-semibold text-slate-300">NIT Manipur • ECE Dept</p>
          <p className="text-[9px] text-slate-400">B.Tech Project 2026-27</p>
        </div>
      </div>
    </aside>
  );
};
