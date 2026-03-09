import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, Clock, Trash2,
  CalendarPlus, Loader2, ListTodo, Search, X,
} from 'lucide-react';
import { tasksAPI, leadsAPI } from '../services/api';
import type { TaskAPI, Lead } from '../services/api';

type FilterStatus = 'active' | 'completed' | 'all';
type FilterPriority = 'all' | 'high' | 'medium' | 'low';

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  meeting: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  call: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  email: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  follow_up: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  other: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300',
};

function buildGoogleCalendarUrl(task: TaskAPI, leadNames: string[]) {
  const desc = task.description || `Task for ${leadNames.join(', ') || 'leads'}`;
  const start = task.due_time
    ? `${task.due_date.replace(/-/g, '')}T${task.due_time.replace(':', '')}00`
    : `${task.due_date.replace(/-/g, '')}`;
  const endDate = new Date(task.due_date);
  if (task.due_time) {
    const [h, m] = task.due_time.split(':').map(Number);
    endDate.setHours(h + 1, m);
    const end = `${task.due_date.replace(/-/g, '')}T${String(endDate.getHours()).padStart(2, '0')}${String(endDate.getMinutes()).padStart(2, '0')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${start}/${end}&details=${encodeURIComponent(desc)}&sf=true`;
  }
  endDate.setDate(endDate.getDate() + 1);
  const end = `${endDate.toISOString().slice(0, 10).replace(/-/g, '')}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${start}/${end}&details=${encodeURIComponent(desc)}&sf=true`;
}

// Multi-select lead picker with search
function LeadPicker({
  allLeads,
  selectedIds,
  onChange,
}: {
  allLeads: Lead[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allLeads.filter(l =>
    l.business_name.toLowerCase().includes(q.toLowerCase()) &&
    !selectedIds.includes(l._id)
  ).slice(0, 8);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  const selectedLeads = allLeads.filter(l => selectedIds.includes(l._id));

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        Linked Leads
      </label>

      {/* Selected pills */}
      <div
        className="min-h-[42px] w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white flex flex-wrap gap-1.5 items-center cursor-text"
        onClick={() => setOpen(true)}
      >
        {selectedLeads.map(l => (
          <span
            key={l._id}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full"
          >
            {l.business_name}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggle(l._id); }}
              className="hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selectedLeads.length === 0 && (
          <span className="text-sm text-gray-400">Search and select leads...</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search leads..."
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400 text-center">No leads found</p>
            ) : (
              filtered.map(l => (
                <button
                  key={l._id}
                  type="button"
                  onClick={() => { toggle(l._id); setQ(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                    {l.business_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.business_name}</p>
                    {l.category && <p className="text-[10px] text-gray-400 truncate">{l.category}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<TaskAPI[]>([]);
  const [leadsMap, setLeadsMap] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');

  const [form, setForm] = useState({
    title: '', description: '', due_date: '', due_time: '',
    lead_ids: [] as string[],
    type: 'follow_up' as TaskAPI['type'],
    priority: 'medium' as TaskAPI['priority'],
  });

  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchAllLeads();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await tasksAPI.getAll();
      if (res.data.success) {
        setTasks(res.data.data || []);
        const allIds = [...new Set((res.data.data || []).flatMap(t => t.lead_ids || []).filter(Boolean))];
        const map: Record<string, Lead> = {};
        await Promise.all(allIds.map(async (lid) => {
          try {
            const lr = await leadsAPI.getById(lid);
            if (lr.data.success) map[lid] = lr.data.data.lead;
          } catch { /* ignore */ }
        }));
        setLeadsMap(map);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchAllLeads = async () => {
    try {
      const res = await leadsAPI.getAll({ limit: 9999 });
      if (res.data.success) setAllLeads(res.data.data);
    } catch { /* silent */ }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', due_date: '', due_time: '', lead_ids: [], type: 'follow_up', priority: 'medium' });
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.due_date) return;
    try {
      setSaving(true);
      await tasksAPI.create({
        lead_ids: form.lead_ids,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        due_date: form.due_date,
        due_time: form.due_time || undefined,
        status: 'pending',
        priority: form.priority,
        type: form.type,
        created_by: 'Team',
      });
      resetForm();
      setShowForm(false);
      fetchTasks();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleToggle = async (task: TaskAPI) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await tasksAPI.update(task._id, { status: newStatus });
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    await tasksAPI.delete(taskId);
    fetchTasks();
  };

  // Filtering
  const filtered = tasks.filter(t => {
    if (filterStatus === 'active' && (t.status === 'completed' || t.status === 'cancelled')) return false;
    if (filterStatus === 'completed' && t.status !== 'completed') return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (search) {
      const s = search.toLowerCase();
      const names = (t.lead_ids || []).map(id => leadsMap[id]?.business_name || '').join(' ');
      if (!t.title.toLowerCase().includes(s) && !names.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const activeCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const overdueCount = tasks.filter(t =>
    t.status !== 'completed' && t.status !== 'cancelled' &&
    new Date(t.due_date) < new Date(new Date().toDateString())
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#CE0505]" />
        <p className="text-sm text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} active{overdueCount > 0 && <span className="text-red-500 font-semibold"> &middot; {overdueCount} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#CE0505] rounded-lg hover:bg-[#b00404] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-4">Create a new task</p>
          <div className="space-y-3">
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title *"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 transition-colors"
            />
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 resize-none transition-colors"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Due Date *</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Time</label>
                <input
                  type="time"
                  value={form.due_time}
                  onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as TaskAPI['type'] }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 appearance-none"
                >
                  <option value="follow_up">Follow Up</option>
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskAPI['priority'] }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Multi-select lead picker */}
            <LeadPicker
              allLeads={allLeads}
              selectedIds={form.lead_ids}
              onChange={ids => setForm(f => ({ ...f, lead_ids: ids }))}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.title.trim() || !form.due_date}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#CE0505] rounded-lg hover:bg-[#b00404] disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks or leads..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['active', 'completed', 'all'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['all', 'high', 'medium', 'low'] as FilterPriority[]).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                filterPriority === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <ListTodo className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">No tasks found</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {tasks.length === 0 ? 'Create your first task to get started' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(task => {
            const isOverdue = task.status !== 'completed' &&
              new Date(task.due_date) < new Date(new Date().toDateString());
            const isCompleted = task.status === 'completed';
            const taskLeads = (task.lead_ids || []).map(id => leadsMap[id]).filter(Boolean);
            const style = TYPE_STYLES[task.type] || TYPE_STYLES.other;

            return (
              <div
                key={task._id}
                className={`bg-white rounded-xl shadow-sm border flex flex-col transition-all hover:shadow-md ${
                  isOverdue ? 'border-red-200' :
                  isCompleted ? 'border-gray-100 opacity-70' :
                  'border-gray-100'
                }`}
              >
                {/* Card top color stripe */}
                <div className={`h-1.5 rounded-t-xl ${
                  isOverdue ? 'bg-red-500' :
                  isCompleted ? 'bg-emerald-400' :
                  task.priority === 'high' ? 'bg-red-400' :
                  task.priority === 'medium' ? 'bg-amber-400' :
                  'bg-gray-200'
                }`} />

                <div className="p-4 flex-1 flex flex-col">
                  {/* Header: type badge + actions */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${style.bg} ${style.text}`}>
                      {task.type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {!isCompleted && (
                        <a
                          href={buildGoogleCalendarUrl(task, taskLeads.map(l => l.business_name))}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Add to Google Calendar"
                          className="p-1.5 text-gray-400 hover:text-[#CE0505] hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(task._id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title + description */}
                  <h3 className={`text-sm font-bold leading-snug ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  {task.description && !isCompleted && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}

                  {/* Linked leads */}
                  {taskLeads.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {taskLeads.map(l => (
                        <button
                          key={l._id}
                          onClick={() => navigate(`/leads/${l._id}`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors truncate max-w-[140px]"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                            {l.business_name.charAt(0)}
                          </span>
                          {l.business_name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      isOverdue ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {task.due_time && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <Clock className="w-3 h-3" />
                        {task.due_time}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      {task.priority}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Overdue</span>
                    )}
                  </div>
                </div>

                {/* Bottom: radio toggle */}
                <div className={`px-4 py-3 border-t flex items-center gap-3 ${
                  isCompleted ? 'border-gray-100 bg-gray-50' : 'border-gray-100'
                }`}>
                  <button
                    onClick={() => handleToggle(task)}
                    className="flex items-center gap-2.5 group w-full"
                  >
                    {/* Radio button */}
                    <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-gray-300 group-hover:border-[#CE0505]'
                    }`}>
                      {isCompleted && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span className={`text-xs font-semibold ${
                      isCompleted ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'
                    }`}>
                      {isCompleted ? 'Completed' : 'Mark as done'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
