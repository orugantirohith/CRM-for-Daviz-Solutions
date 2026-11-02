import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { CalendarEvent, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime, getDubaiCurrentDate } from '../../lib/dates/dubaiDate';
import { filterRecordsByScope } from '../../lib/permissions/permissionCheck';

interface CalendarViewProps {
  currentUser: UserProfile;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ currentUser }) => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowIso);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const leads = useMemo(
    () => filterRecordsByScope(crmService.getLeads(), currentUser, 'leads'),
    [currentUser]
  );
  const allUsers = crmService.getUsers();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['event_type']>('Meeting');
  const [eventDate, setEventDate] = useState(tomorrowIso);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [location, setLocation] = useState('JAFZA South Executive Offices');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([currentUser.id]);
  const [linkedLeadId, setLinkedLeadId] = useState(leads[0]?.id || '');

  const events = useMemo(() => {
    const raw = crmService.getCalendarEvents();
    return filterRecordsByScope(raw, currentUser, 'calendar');
  }, [isModalOpen, currentUser]);

  const selectedDateEvents = useMemo(() => {
    return events.filter((e) => e.start_at.startsWith(selectedDate));
  }, [events, selectedDate]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lead = leads.find((l) => l.id === linkedLeadId);
    const attendees = allUsers
      .filter((u) => selectedAttendees.includes(u.id))
      .map((u) => ({ user_id: u.id, display_name: u.display_name, email: u.email }));

    crmService.createCalendarEvent({
      title: title.trim(),
      description: description.trim(),
      event_type: eventType,
      start_at: `${eventDate}T${startTime}:00Z`,
      end_at: `${eventDate}T${endTime}:00Z`,
      timezone: 'Asia/Dubai',
      created_by: currentUser.id,
      assigned_to: currentUser.id,
      company_id: lead ? lead.company_id : undefined,
      company_name: lead ? lead.company_name : undefined,
      lead_id: lead ? lead.id : undefined,
      location: location.trim(),
      status: 'Scheduled',
      attendees,
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  // Dynamic Month calculation based on selectedDate (YYYY-MM-DD)
  const [activeYear, activeMonth] = selectedDate.split('-').map(Number);
  const totalDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const firstDayWeekday = new Date(activeYear, activeMonth - 1, 1).getDay();
  const monthLabel = new Date(activeYear, activeMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleShiftMonth = (delta: number) => {
    const d = new Date(activeYear, activeMonth - 1 + delta, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedDate(`${y}-${m}-01`);
  };

  const daysInMonth = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter((e) => e.start_at.startsWith(dateStr));
    const isToday = dateStr === todayIso;
    const isSelected = dateStr === selectedDate;

    return {
      day,
      dateStr,
      dayEvents,
      isToday,
      isSelected,
    };
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Calendar & Appointments</h2>
          <p className="text-xs text-slate-500">
            Timezone: <span className="font-semibold text-cyan-700">Asia/Dubai (UTC+4)</span> • Client sessions, workshops, and attendee notifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            {(['month', 'week', 'day'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  viewMode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setEventDate(selectedDate);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Section: Left Navigator + Calendar Grid + Right Day Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar Grid (3 Cols) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{monthLabel}</h3>
              <span className="text-xs text-slate-400 font-medium">(Dubai Local Time)</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <button
                type="button"
                onClick={() => handleShiftMonth(-1)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="px-2.5 py-1 text-xs font-medium hover:bg-slate-100 rounded-lg"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleShiftMonth(1)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-slate-400 py-1 border-b border-slate-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1.5 min-h-[360px]">
            {Array.from({ length: firstDayWeekday }).map((_, idx) => (
              <div key={`empty-${idx}`} className="p-2 opacity-20 text-slate-300 text-xs text-right" />
            ))}

            {daysInMonth.map((d) => (
              <div
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`p-2 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition-all min-h-[76px] ${
                  d.isSelected
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20'
                    : d.isToday
                    ? 'border-cyan-400 bg-cyan-50/10 shadow-xs'
                    : 'border-slate-100 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-xs ${
                      d.isToday
                        ? 'w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-[11px]'
                        : 'text-slate-700'
                    }`}
                  >
                    {d.day}
                  </span>
                  {d.isToday && (
                    <span className="text-[9px] font-bold text-cyan-600 uppercase tracking-tighter">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-1">
                  {d.dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 truncate"
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {d.dayEvents.length > 2 && (
                    <span className="text-[9px] text-slate-400 font-medium pl-1">
                      +{d.dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Date's Agenda (Right Col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider block">
              Selected Agenda
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              {formatDubaiDateTime(selectedDate, false)}
            </h3>
          </div>

          <div className="space-y-3">
            {selectedDateEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No events scheduled on this date.
                <button
                  type="button"
                  onClick={() => {
                    setEventDate(selectedDate);
                    setIsModalOpen(true);
                  }}
                  className="mt-3 block mx-auto text-xs font-semibold text-cyan-600 hover:underline"
                >
                  + Add Event
                </button>
              </div>
            ) : (
              selectedDateEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ev.title}</span>
                    <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded-full">
                      {ev.event_type}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDubaiDateTime(ev.start_at, true)}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    {ev.company_name && (
                      <div className="flex items-center gap-1.5 text-cyan-700 font-medium">
                        <span>Account: {ev.company_name}</span>
                      </div>
                    )}
                  </div>

                  {ev.attendees && ev.attendees.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="truncate">
                        Attendees: {ev.attendees.map((a) => a.display_name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">Schedule Calendar Event</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scoping Workshop: Power BI Architecture"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Meeting">Scoping Meeting</option>
                    <option value="Visit">Physical Client Visit</option>
                    <option value="Demo">Technical Demo</option>
                    <option value="Internal">Internal Review</option>
                    <option value="Call">Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date (Dubai)</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Time (Dubai)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Time (Dubai)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Linked Account</label>
                <select
                  value={linkedLeadId}
                  onChange={(e) => setLinkedLeadId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                >
                  <option value="">None (General)</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} ({l.contact_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. JAFZA South or Microsoft Teams"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Attendees (Will be notified)
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {allUsers.map((u) => {
                    const checked = selectedAttendees.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer border transition-colors ${
                          checked
                            ? 'bg-cyan-600 text-white border-cyan-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAttendees([...selectedAttendees, u.id]);
                            } else {
                              setSelectedAttendees(selectedAttendees.filter((id) => id !== u.id));
                            }
                          }}
                        />
                        {u.display_name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
