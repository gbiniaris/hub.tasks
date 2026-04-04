import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import TaskTable from '../components/tasks/TaskTable';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskFormModal from '../components/tasks/TaskFormModal';

export default function Tasks() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.project_id) q.project_id = filters.project_id;
    if (filters.assigned_to_email) q.assigned_to_email = filters.assigned_to_email;
    const data = Object.keys(q).length ? await base44.entities.Task.filter(q) : await base44.entities.Task.list('-updated_date', 200);
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('tasks')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} total tasks</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t('createTask')}
        </Button>
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