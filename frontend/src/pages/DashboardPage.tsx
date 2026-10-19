import React, { useEffect, useState } from 'react';
import {
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  ShieldCheck,
  Activity,
  ArrowRight,
  Flame,
  Lightbulb,
  Wind,
  Sparkles,
  Inbox
} from 'lucide-react';
import { DashboardStats } from '../types';
import { api } from '../services/api';

interface DashboardPageProps {
  onStartAssistant: () => void;
  onNavigateTab: (tab: string) => void;
  isCameraActive: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onStartAssistant,
  onNavigateTab,
  isCameraActive,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboard();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Call to Action */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-sky-800 rounded-2xl p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-sky-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistive Healthcare Technology</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Single-Click Assistant
          </h1>
          <p className="text-sky-100 text-sm max-w-xl leading-relaxed">
            Hands-free assistive communication and virtual smart room control for paralyzed patients,
            driven by real-time webcam eye-blink gestures.
          </p>
        </div>

        <button
          onClick={onStartAssistant}
          className="z-10 bg-white text-brand-700 hover:bg-sky-50 font-bold px-6 py-3.5 rounded-xl text-sm transition shadow-lg flex items-center space-x-2 flex-shrink-0 group hover:scale-[1.02]"
        >
          <Eye className="w-5 h-5 text-brand-600 group-hover:scale-110 transition-transform" />
          <span>Start Eye-Blink Assistant</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>

        {/* Ambient background graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Requests Today */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Requests Today
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {stats?.requests_today ?? 0}
            </p>
            <p className="text-[11px] text-slate-400">Recorded patient interactions</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Emergency Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Emergency Alerts
            </p>
            <p className={`text-2xl font-extrabold ${(stats?.emergency_alerts_count ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {stats?.emergency_alerts_count ?? 0}
            </p>
            <p className="text-[11px] text-slate-400">High priority assistance requests</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(stats?.emergency_alerts_count ?? 0) > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Caregiver Acks */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Caregiver Acks
            </p>
            <p className="text-2xl font-extrabold text-emerald-600">
              {stats?.caregiver_acknowledgements ?? 0}
            </p>
            <p className="text-[11px] text-slate-400">Timely attended responses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* System & Mode Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Mode
            </p>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[140px]">
              {stats?.active_mode || 'Webcam Live'}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {isCameraActive ? 'Camera Connected' : 'Camera Standby'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Eye className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Smart Room Quick Preview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smart Room Quick Widget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Home className="w-4 h-4 text-brand-600" />
              Smart Room Status
            </h2>
            <button
              onClick={() => onNavigateTab('smart-room')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Control Panel →
            </button>
          </div>

          <div className="space-y-3">
            {/* Light Widget */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats?.room_light_on ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Simulated Light</p>
                  <p className="text-[11px] text-slate-400">
                    {stats?.room_light_on ? 'Light is turned ON' : 'Light is turned OFF'}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${stats?.room_light_on ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                {stats?.room_light_on ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Fan Widget */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${(stats?.room_fan_speed ?? 0) > 0 ? 'bg-sky-100 text-sky-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Wind className={`w-5 h-5 ${(stats?.room_fan_speed ?? 0) > 0 ? 'animate-spin-normal' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Simulated Fan</p>
                  <p className="text-[11px] text-slate-400">
                    {(stats?.room_fan_speed ?? 0) > 0 ? `Speed level ${stats?.room_fan_speed} of 5` : 'Fan is turned OFF'}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${(stats?.room_fan_speed ?? 0) > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'}`}>
                {(stats?.room_fan_speed ?? 0) > 0 ? `Level ${stats?.room_fan_speed}` : 'OFF'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800">
            <p className="font-semibold">Notice:</p>
            <p>SIMULATION MODE — NO PHYSICAL DEVICES CONNECTED. Controls reflect virtual room state.</p>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Recent Activity Feed
            </h2>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Full History ({stats?.recent_activity.length ?? 0}) →
            </button>
          </div>

          {stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1 space-y-1">
              {stats.recent_activity.map((event) => {
                let badgeColor = 'bg-slate-100 text-slate-700';
                if (event.priority === 'HIGH') badgeColor = 'bg-red-100 text-red-700 border border-red-200';
                else if (event.priority === 'MEDIUM') badgeColor = 'bg-amber-100 text-amber-700 border border-amber-200';
                else if (event.status === 'SUCCESS') badgeColor = 'bg-emerald-100 text-emerald-700';

                return (
                  <div key={event.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3 truncate">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${badgeColor}`}>
                        {event.priority || event.type}
                      </span>
                      <span className="font-medium text-slate-800 truncate">
                        {event.description}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0 ml-2">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center space-y-2">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-500">No events recorded yet.</p>
              <p className="text-[11px] text-slate-400">
                Trigger an eye blink or use manual simulation to generate interactions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
