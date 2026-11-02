import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Clock,
  Calendar,
  Users,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, ScheduledMessage, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';

interface FloatingChatPanelProps {
  currentUser: UserProfile;
}

export const FloatingChatPanel: React.FC<FloatingChatPanelProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'scheduled'>('chat');
  const [messageText, setMessageText] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Scheduled message form state
  const [schedRecipient, setSchedRecipient] = useState<string>('all');
  const [schedDate, setSchedDate] = useState<string>('2026-10-28');
  const [schedTime, setSchedTime] = useState<string>('08:00');
  const [schedContent, setSchedContent] = useState<string>('');
  const [createLinkedCalendarEvent, setCreateLinkedCalendarEvent] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      conversation_id: 'conv-general',
      sender_id: 'usr-admin-1',
      sender_name: 'David Vance (Admin)',
      content: 'Welcome team! Please log your weekly client visits and update tomorrow morning plans.',
      mentions: [],
      created_at: '2026-10-26T09:00:00Z',
    },
    {
      id: 'm2',
      conversation_id: 'conv-general',
      sender_id: 'usr-mgr-1',
      sender_name: 'Karim Mansoor',
      content: '@Zayed Great progress on the Al-Futtaim Logistics proposal. Let us close it before Thursday.',
      mentions: ['usr-agent-1'],
      created_at: '2026-10-26T14:15:00Z',
    },
  ]);

  const allUsers = crmService.getUsers().filter((u) => u.id !== currentUser.id);
  const scheduledList = crmService.getScheduledMessages();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // Detect @all or @username
    const mentions: string[] = [];
    if (messageText.includes('@all')) {
      if (currentUser.role_id !== 'admin' && currentUser.role_id !== 'sales_manager') {
        alert('Permission Denied: Only Admins and Sales Managers can broadcast with @all.');
        return;
      }
    }

    const newMsg: ChatMessage = {
      id: `m-${Date.now().toString(36)}`,
      conversation_id: 'conv-general',
      sender_id: currentUser.id,
      sender_name: currentUser.display_name,
      content: messageText.trim(),
      mentions,
      created_at: new Date().toISOString(),
    };

    setMessages([...messages, newMsg]);
    setMessageText('');
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedContent.trim()) return;

    const scheduledIso = `${schedDate}T${schedTime}:00Z`;
    let recipientLabel = 'All Team Members (@all)';
    let recType: 'direct' | 'all' = 'all';

    if (schedRecipient !== 'all') {
      const u = allUsers.find((x) => x.id === schedRecipient);
      recipientLabel = u ? u.display_name : schedRecipient;
      recType = 'direct';
    }

    crmService.createScheduledMessage({
      sender_id: currentUser.id,
      sender_name: currentUser.display_name,
      recipient_type: recType,
      recipient_id: schedRecipient !== 'all' ? schedRecipient : undefined,
      recipient_label: recipientLabel,
      content: schedContent.trim(),
      scheduled_for: scheduledIso,
    });

    if (createLinkedCalendarEvent) {
      crmService.createCalendarEvent({
        title: `Scheduled Task: ${recipientLabel}`,
        description: schedContent.trim(),
        event_type: 'Visit',
        start_at: scheduledIso,
        end_at: `${schedDate}T09:00:00Z`,
        timezone: 'Asia/Dubai',
        assigned_to: schedRecipient !== 'all' ? schedRecipient : currentUser.id,
        created_by: currentUser.id,
        status: 'Scheduled',
        attendees: [
          { user_id: currentUser.id, display_name: currentUser.display_name },
          ...(schedRecipient !== 'all'
            ? [{ user_id: schedRecipient, display_name: recipientLabel }]
            : []),
        ],
      });
    }

    setShowScheduleModal(false);
    setSchedContent('');
    setNotificationStatus(`Message scheduled for ${formatDubaiDateTime(scheduledIso)}!`);
    setTimeout(() => setNotificationStatus(null), 4000);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-3 sm:px-4 sm:py-3 bg-[#0B132B] hover:bg-slate-900 text-white rounded-full shadow-2xl border border-cyan-500/40 hover:border-cyan-400 transition-all hover:scale-105 group min-h-[44px] min-w-[44px] justify-center"
          aria-label="Open team command and chat panel"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-[#0B132B]" />
          </div>
          <span className="hidden sm:inline text-xs font-semibold tracking-wide">Team Command & Chat</span>
        </button>
      </div>

      {/* Floating Drawer / Panel */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-20 top-16 sm:top-auto sm:inset-x-auto sm:bottom-20 sm:right-6 sm:w-96 sm:h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-[#0B132B] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                ⌘
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">Team Coordination</h4>
                <p className="text-[10px] text-slate-400">Asia/Dubai • UTC+4</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-w-[40px] min-h-[40px] p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-cyan-500 text-cyan-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Live Team Channel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
                activeTab === 'scheduled'
                  ? 'border-cyan-500 text-cyan-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Scheduled Queue ({scheduledList.length})
            </button>
          </div>

          {notificationStatus && (
            <div className="p-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {notificationStatus}
            </div>
          )}

          {/* Body Content */}
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {/* Message List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
                {messages.map((m) => (
                  <div key={m.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {m.sender_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDubaiDateTime(m.created_at, true)}
                      </span>
                    </div>
                    <div className="mt-1 p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs leading-relaxed shadow-xs">
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input & Scheduled Message Trigger */}
              <div className="p-3 bg-white border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400">
                    Use <code className="text-cyan-600 font-mono">@user</code> or <code className="text-cyan-600 font-mono">@all</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSchedContent('');
                      setShowScheduleModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md hover:bg-cyan-100 transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    Schedule Automated Reminder
                  </button>
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type message or @mention teammate..."
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#0B132B] hover:bg-slate-900 text-white rounded-lg transition-colors"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-2.5 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Scheduled Dispatch</span>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded-md font-medium"
                >
                  + New Schedule
                </button>
              </div>

              {scheduledList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No pending scheduled messages.
                </div>
              ) : (
                scheduledList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        To: {item.recipient_label}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{item.content}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Delivery: {formatDubaiDateTime(item.scheduled_for)}</span>
                      {item.status === 'scheduled' && (
                        <button
                          type="button"
                          onClick={() => crmService.cancelScheduledMessage(item.id)}
                          className="text-rose-600 hover:underline font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold">Schedule Team Message / Visit Alert</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Recipient</label>
                <select
                  value={schedRecipient}
                  onChange={(e) => setSchedRecipient(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-white"
                >
                  <option value="all">Broadcast to All Users (@all)</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name} ({u.role_name || u.role_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date (Dubai)</label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Time (Dubai)</label>
                  <input
                    type="time"
                    required
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Message Content</label>
                <textarea
                  required
                  rows={3}
                  value={schedContent}
                  onChange={(e) => setSchedContent(e.target.value)}
                  placeholder="e.g., @Zayed Tomorrow at 8:00 AM, visit Al-Futtaim Logistics and submit visit report."
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-cyan-50/60 border border-cyan-100 rounded-lg">
                <input
                  type="checkbox"
                  id="linkCal"
                  checked={createLinkedCalendarEvent}
                  onChange={(e) => setCreateLinkedCalendarEvent(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="linkCal" className="text-slate-700 font-medium">
                  Automatically create linked event on CRM Calendar
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
