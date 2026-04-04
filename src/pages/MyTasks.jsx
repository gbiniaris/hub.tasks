import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserCircle } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import TaskTable from '../components/tasks/TaskTable';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskFormModal from '../components/tasks/TaskFormModal';

export default function MyTasks() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState(null);

  const load = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const q = { assigned_to_email: me.email };
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.project_id) q.project_id = filters.project_id;
    const data = await base44.entities.Task.filter(q);
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  const stats = {
    open: tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length,
    overdue: tasks.filter(t => t.is_overdue).length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('myTasks')}</h1>
            <p className="text-sm text-muted-foreground">{user?.full_name}</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t('createTask')}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('openTasks'), value: stats.open, color: 'text-blue-600' },
          { label: t('overdueTasks'), value: stats.overdue, color: 'text-red-600' },
          { label: t('done'), value: stats.done, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <TaskFilters filters={filters} onChange={setFilters} />
      </div>

      <TaskTable tasks={tasks} loading={loading} onTaskClick={t => navigate(`/tasks/${t.id}`)} />

      {showModal && (
        <TaskFormModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}