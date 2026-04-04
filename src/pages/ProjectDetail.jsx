import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Users, CheckSquare, AlertCircle, BarChart2, Loader2, Plus } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import TaskTable from '../components/tasks/TaskTable';
import TaskFormModal from '../components/tasks/TaskFormModal';
import { format } from 'date-fns';

const HEALTH_CONFIG = {
  on_track: { label: 'On Track', className: 'bg-green-100 text-green-700' },
  at_risk: { label: 'At Risk', className: 'bg-amber-100 text-amber-700' },
  off_track: { label: 'Off Track', className: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', className: 'bg-indigo-100 text-indigo-700' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const [projs, tsk, asn] = await Promise.all([
      base44.entities.Project.filter({ id }),
      base44.entities.Task.filter({ project_id: id }),
      base44.entities.ProjectAssignment.filter({ project_id: id }),
    ]);
    setProject(projs[0]);
    setTasks(tsk);
    setAssignments(asn);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!project) return <div className="text-center text-muted-foreground py-20">Project not found</div>;

  const openTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => t.is_overdue).length;
  const health = HEALTH_CONFIG[project.health] || HEALTH_CONFIG.on_track;

  const TABS = ['tasks', 'members', 'analytics'];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/projects')} className="mt-1 p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${health.className}`}>{health.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={project.status} size="md" />
              <PriorityBadge priority={project.priority} />
              {project.project_manager_email && (
                <span className="text-xs text-muted-foreground">PM: {project.project_manager_email.split('@')[0]}</span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => {}} className="gap-2">
          <Edit className="w-4 h-4" /> {t('edit')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{openTasks}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('openTasks')}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{overdueTasks}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('overdueTasks')}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{project.completion_percentage || 0}%</div>
          <div className="text-xs text-muted-foreground mt-1">{t('completion')}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{tasks.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Tasks</div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-foreground">{t('completion')}</span>
          <span className="font-bold text-primary">{project.completion_percentage || 0}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${project.completion_percentage || 0}%` }} />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          {project.start_date && <span>Start: {format(new Date(project.start_date), 'MMM d, yyyy')}</span>}
          {project.end_date && <span>End: {format(new Date(project.end_date), 'MMM d, yyyy')}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >{t(tab)}</button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTaskModal(true)} className="gap-2">
              <Plus className="w-4 h-4" /> {t('createTask')}
            </Button>
          </div>
          <TaskTable tasks={tasks} onTaskClick={task => navigate(`/tasks/${task.id}`)} />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No members assigned</div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('users')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('role')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-foreground">{a.user_email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{a.project_role}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status === 'active' ? 'active' : 'cancelled'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-2 gap-4">
          {['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled'].map(status => {
            const count = tasks.filter(t => t.status === status).length;
            const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
            return (
              <div key={status} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-lg font-bold text-foreground">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% of tasks</p>
              </div>
            );
          })}
        </div>
      )}

      {showTaskModal && (
        <TaskFormModal
          projectId={id}
          onClose={() => setShowTaskModal(false)}
          onSave={() => { setShowTaskModal(false); load(); }}
        />
      )}
    </div>
  );
}