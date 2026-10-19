import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Download,
  Inbox
} from 'lucide-react';
import { ActivityEvent } from '../types';
import { api } from '../services/api';

export const ActivityHistoryPage: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const fetchEvents = async () => {
    try {
      const filters: any = {};
      if (selectedType !== 'ALL') filters.event_type = selectedType;
      if (selectedPriority !== 'ALL') filters.priority = selectedPriority;
      if (search.trim()) filters.search = search.trim();

      const data = await api.getEvents(filters);
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedType, selectedPriority, search]);

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear event history?")) {
      await api.clearEvents();
      fetchEvents();
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) return;
    const headers = ['ID', 'Type', 'Description', 'Priority', 'Status', 'Timestamp', 'IsDemo'];
    const rows = events.map(e => [
      e.id,
      e.type,
      `"${e.description.replace(/"/g, '""')}"`,
      e.priority,
      e.status,
      e.timestamp,
      e.is_demo ? 'Yes' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `single_click_assistant_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            Activity & Telemetry History
          </h1>
          <p className="text-xs text-slate-500">
            Persistent audit log of gestures, requests, caregiver acknowledgments, and room commands stored in SQLite.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleClearHistory}
            disabled={events.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity description..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Event Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
          >
            <option value="ALL">All Event Types</option>
            <option value="patient_request">Patient Request</option>
            <option value="emergency_alert">Emergency Alert</option>
            <option value="caregiver_ack">Caregiver Ack</option>
            <option value="alert_resolved">Alert Resolved</option>
            <option value="room_command">Smart Room</option>
            <option value="menu_navigation">Menu Navigation</option>
            <option value="gesture_classified">Gesture Classified</option>
            <option value="system_event">System Event</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {events.length > 0 ? (
          events.map((event) => {
            let priorityClass = 'bg-slate-100 text-slate-700';
            if (event.priority === 'HIGH') priorityClass = 'bg-red-100 text-red-700 border border-red-200 font-bold';
            else if (event.priority === 'MEDIUM') priorityClass = 'bg-amber-100 text-amber-700 border border-amber-200 font-bold';
            else if (event.priority === 'LOW') priorityClass = 'bg-sky-100 text-sky-700';

            return (
              <div key={event.id} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3.5 truncate">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${priorityClass}`}>
                    {event.priority}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">
                      {event.description}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Type: <span className="font-mono text-slate-600">{event.type}</span> • Status: <span className="font-semibold text-slate-600">{event.status}</span>
                      {event.is_demo && <span className="ml-1 text-slate-400 font-mono">(Demo Seed)</span>}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4 font-mono text-[11px] text-slate-500">
                  <p>{new Date(event.timestamp).toLocaleDateString()}</p>
                  <p className="text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No Events Found</p>
            <p className="text-xs text-slate-400">
              No events matched the selected filters or search keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
