import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import TaskTable from '../components/tasks/TaskTable';
import TaskFilters from '../components/tasks/TaskFilters';

export default function TeamTasks() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');

  const load = async () => {
    setLoading(true);
    const [allTeams] = await Promise.all([base44.entities.Team.list('-updated_date', 50)]);
    setTeams(allTeams);
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.project_id) q.project_id = filters.project_id;
    const data = Object.keys(q).length ? await base44.entities.Task.filter(q) : await base44.entities.Task.list('-updated_date', 200);
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('teamTasks')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} tasks across all teams</p>
        </div>
        <select
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
        >
          <option value="">{t('allTeams')}</option>
          {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <TaskFilters filters={filters} onChange={setFilters} />
      </div>

      <TaskTable tasks={tasks} loading={loading} onTaskClick={task => navigate(`/tasks/${task.id}`)} />
    </div>
  );
}