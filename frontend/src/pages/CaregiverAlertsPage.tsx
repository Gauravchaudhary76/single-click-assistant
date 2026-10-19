import React, { useEffect, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  X,
  VolumeX,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  Inbox,
  UserCheck
} from 'lucide-react';
import { PatientRequest } from '../types';
import { api } from '../services/api';
import { audio } from '../services/audio';

export const CaregiverAlertsPage: React.FC = () => {
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [emergencyCount, setEmergencyCount] = useState<number>(0);
  const [escalationTimeout, setEscalationTimeout] = useState<number>(60);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('Assistance provided to patient.');

  const fetchAlerts = async () => {
    try {
      const data = await api.getCaregiverAlerts();
      setEmergencyCount(data.emergency_count);
      setEscalationTimeout(data.escalation_timeout_sec);

      // Also get all requests for the filter list
      const allReqs = await api.getRequests();
      setRequests(allReqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeRequest(id);
      audio.stopEmergencySiren();
      audio.speak("Request acknowledged by caregiver.");
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.resolveRequest(id, resolutionNote);
      audio.stopEmergencySiren();
      audio.speak("Request marked as resolved.");
      setResolvingId(null);
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const activeEmergencies = requests.filter(r => r.priority === 'HIGH' && r.status === 'NEW');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Title & Caregiver Profile */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-600" />
            Caregiver Alert & Dispatch Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time queue of patient requests, priority triage, and acknowledgment logging.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Station 1: On-Duty Nurse (Simulated)</span>
          </div>
          {emergencyCount > 0 && (
            <button
              onClick={() => audio.stopEmergencySiren()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 flex items-center space-x-1"
              title="Silence audio alert buzzer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Silence Alarm</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Emergency Alert Cards */}
      {activeEmergencies.length > 0 && (
        <div className="space-y-3">
          {activeEmergencies.map((em) => (
            <div
              key={em.id}
              className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-emergency-flash"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-600 text-white uppercase">
                      CRITICAL EMERGENCY
                    </span>
                    <span className="text-xs font-mono text-red-700">
                      ID: {em.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-red-950 mt-1">
                    {em.title}
                  </h3>
                  <p className="text-xs text-red-800 mt-0.5">
                    Triggered at {new Date(em.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <button
                  onClick={() => handleAcknowledge(em.id)}
                  className="flex-1 md:flex-initial bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition"
                >
                  Acknowledge Emergency
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          Showing {filteredRequests.length} requests
        </span>
      </div>

      {/* Requests Queue Table / Cards */}
      <div className="space-y-3">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const now = new Date().getTime();
            const createdTime = new Date(req.created_at).getTime();
            const elapsedSec = Math.floor((now - createdTime) / 1000);
            const isEscalated = (req.priority === 'HIGH' || req.priority === 'MEDIUM') && req.status === 'NEW' && elapsedSec > escalationTimeout;

            let priorityBadge = 'bg-slate-100 text-slate-700';
            if (req.priority === 'HIGH') priorityBadge = 'bg-red-100 text-red-700 border border-red-200 font-bold';
            else if (req.priority === 'MEDIUM') priorityBadge = 'bg-amber-100 text-amber-700 border border-amber-200 font-bold';
            else if (req.priority === 'LOW') priorityBadge = 'bg-sky-100 text-sky-700 border border-sky-200';

            let statusBadge = 'bg-slate-100 text-slate-600';
            if (req.status === 'NEW') statusBadge = 'bg-blue-100 text-blue-800 font-bold animate-pulse';
            else if (req.status === 'ACKNOWLEDGED') statusBadge = 'bg-amber-100 text-amber-800 font-bold';
            else if (req.status === 'RESOLVED') statusBadge = 'bg-emerald-100 text-emerald-800 font-bold';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition space-y-3 ${
                  isEscalated ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider ${priorityBadge}`}>
                      {req.priority} Priority
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase ${statusBadge}`}>
                      {req.status}
                    </span>
                    {req.is_demo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Created: {new Date(req.created_at).toLocaleTimeString()} ({elapsedSec}s ago)</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-base">
                      {req.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Request Type: <span className="font-mono text-slate-700 uppercase font-semibold">{req.type}</span> • ID: {req.id.slice(0, 8)}
                    </p>
                    {req.resolution_note && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                        Note: {req.resolution_note}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {req.status === 'NEW' && (
                      <button
                        onClick={() => handleAcknowledge(req.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
                      >
                        Acknowledge
                      </button>
                    )}

                    {req.status === 'ACKNOWLEDGED' && (
                      <button
                        onClick={() => setResolvingId(req.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                      >
                        Resolve Request
                      </button>
                    )}

                    {req.status !== 'RESOLVED' && req.status !== 'CANCELLED' && (
                      <button
                        onClick={async () => {
                          await api.cancelRequest(req.id);
                          fetchAlerts();
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated Escalation Warning Banner */}
                {isEscalated && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center space-x-2 text-xs text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="font-medium">
                      SIMULATED ESCALATION: Request unacknowledged beyond {escalationTimeout}s timeout threshold. In production, secondary caregiver on-call paging would be triggered.
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">No Requests In This View</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No requests matching the selected filter. Patient requests triggered via eye blink will appear here instantly.
            </p>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Resolve Patient Request</h3>
            <p className="text-xs text-slate-500">
              Provide a brief caregiver service note before completing:
            </p>
            <input
              type="text"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              placeholder="e.g., Assisted patient with water"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setResolvingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(resolvingId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
