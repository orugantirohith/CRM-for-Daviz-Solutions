import React, { useState, useMemo } from 'react';
import { CheckSquare, Plus, CheckCircle2, Clock, AlertCircle, Building2 } from 'lucide-react';
import { Task, TaskStatus, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';
import { filterRecordsByScope } from '../../lib/permissions/permissionCheck';

interface TaskListViewProps {
  currentUser: UserProfile;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ currentUser }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('2026-10-29T12:00:00Z');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState(currentUser.id);

  const allUsers = crmService.getUsers();

  const tasks = useMemo(() => {
    let result = filterRecordsByScope(crmService.getTasks(), currentUser, 'tasks');
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    return result;
  }, [statusFilter, isModalOpen, currentUser, refreshKey]);

  const isPrivileged = currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager';

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalAssignedTo = isPrivileged ? assignedTo : currentUser.id;
    const assigned = allUsers.find((u) => u.id === finalAssignedTo);

    crmService.createTask({
      title: title.trim(),
      description: description.trim(),
      assigned_to: finalAssignedTo,
      assigned_user_name: assigned?.display_name || currentUser.display_name,
      created_by: currentUser.id,
      created_by_name: currentUser.display_name,
      due_at: dueDate,
      priority,
      status: 'To Do',
    });

    setRefreshKey((k) => k + 1);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleToggleTaskStatus = (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
    crmService.updateTaskStatus(task.id, nextStatus, 'Marked via quick toggle.');
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Operational Tasks</h2>
          <p className="text-xs text-slate-500">
            Action items linked to sales scoping, commercial agreements, and deliverables
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-medium">
        {['all', 'To Do', 'In Progress', 'Completed'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`py-2 px-4 border-b-2 capitalize transition-colors ${
              statusFilter === st
                ? 'border-cyan-600 text-cyan-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {st === 'all' ? 'All Tasks' : st}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
            No tasks found in this view.
          </div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-xl border transition-all flex items-start gap-3 text-xs bg-white ${
                t.status === 'Completed' ? 'opacity-70 bg-slate-50/50' : 'border-slate-200 shadow-xs'
              }`}
            >
              <input
                type="checkbox"
                checked={t.status === 'Completed'}
                onChange={() => handleToggleTaskStatus(t)}
                className="mt-1 w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-500 text-[10px]">
                    {t.task_code}
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      t.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-900'
                    }`}
                  >
                    {t.title}
                  </span>
                  <StatusBadge status={t.status} size="sm" />
                </div>

                <p className="text-slate-600 leading-relaxed">{t.description}</p>

                <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                  <span>Due: {formatDubaiDateTime(t.due_at)}</span>
                  <span>Assigned to: {t.assigned_user_name}</span>
                  {t.related_title && (
                    <span className="text-cyan-700 font-medium">Linked: {t.related_title}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">New Operational Task</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Prepare SLA document for Al-Futtaim Power BI rollout"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assignee</label>
                {isPrivileged ? (
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 font-medium"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.display_name} ({u.role_name || u.role_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.display_name} (${currentUser.role_name || 'Sales Agent'})`}
                    className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-medium cursor-not-allowed"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate.slice(0, 16)}
                    onChange={(e) => setDueDate(new Date(e.target.value).toISOString())}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specific instructions or expected deliverables..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
