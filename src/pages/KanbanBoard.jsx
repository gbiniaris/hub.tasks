import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import PriorityBadge from '../components/PriorityBadge';
import TaskFormModal from '../components/tasks/TaskFormModal';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'bg-slate-200' },
  { key: 'todo', label: 'To Do', color: 'bg-blue-200' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-amber-200' },
  { key: 'in_review', label: 'In Review', color: 'bg-purple-200' },
  { key: 'blocked', label: 'Blocked', color: 'bg-red-200' },
  { key: 'done', label: 'Done', color: 'bg-green-200' },
];

export default function KanbanBoard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState([]);

  const load = async () => {
    const q = projectFilter ? { project_id: projectFilter } : {};
    const [t, p] = await Promise.all([
      Object.keys(q).length ? base44.entities.Task.filter(q) : base44.entities.Task.list('-updated_date', 300),
      base44.entities.Project.list('-updated_date', 50),
    ]);
    setTasks(t);
    setProjects(p);
  };

  useEffect(() => { load(); }, [projectFilter]);

  // Build a map of taskId → blocker task for tasks with unresolved dependencies
  const blockedMap = {};
  tasks.forEach(task => {
    if (task.blocked_by_task_id) {
      const blocker = tasks.find(t => t.id === task.blocked_by_task_id);
      if (blocker && blocker.status !== 'done') {
        blockedMap[task.id] = blocker;
      }
    }
  });

  const byStatus = (status) => tasks.filter(t => t.status === status);

  const onDrop = async (newStatus) => {
    if (!dragging || dragging.status === newStatus) { setDragging(null); setDragOver(null); return; }
    if (blockedMap[dragging.id] && newStatus !== 'blocked') {
      alert(`Cannot move "${dragging.title}" — it is blocked by "${blockedMap[dragging.id].title}" which is not yet Done.`);
      setDragging(null); setDragOver(null); return;
    }
    await base44.entities.Task.update(dragging.id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === dragging.id ? { ...t, status: newStatus } : t));
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('kanban')}</h1>
        <div className="flex items-center gap-3">
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          >
            <option value="">{t('allProjects')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-4 h-4" /> {t('createTask')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {COLUMNS.map(col => {
          const colTasks = byStatus(col.key);
          const isOver = dragOver === col.key;
          return (
            <div
              key={col.key}
              className={`shrink-0 w-72 flex flex-col rounded-xl border transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
              onDrop={() => onDrop(col.key)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold text-foreground">{t(col.key.replace('_', '')) || col.label}</span>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragging(task)}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`border rounded-xl p-3 cursor-pointer hover:shadow-md transition-all select-none ${
                      dragging?.id === task.id ? 'opacity-40' : ''
                    } ${blockedMap[task.id] ? 'bg-amber-50 border-amber-300' : 'bg-card border-border'}`}
                  >
                    {blockedMap[task.id] && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium mb-2">
                        <Lock className="w-3 h-3" />
                        Blocked by: {blockedMap[task.id].title.slice(0, 28)}{blockedMap[task.id].title.length > 28 ? '…' : ''}
                      </div>
                    )}
                    <p className="text-sm font-medium text-foreground leading-snug mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <PriorityBadge priority={task.priority} />
                      {task.assigned_to_email && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {task.assigned_to_email.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {task.is_overdue && (
                      <div className="mt-2 text-xs text-red-600 font-medium">⚠ Overdue</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <TaskFormModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}