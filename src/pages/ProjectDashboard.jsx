import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FolderOpen, CheckSquare, AlertCircle, TrendingUp, Users, ChevronDown } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import KPICard from '../components/dashboard/KPICard';
import ChartCard from '../components/dashboard/ChartCard';
import { buildCompletionTrend, groupAndCount, buildWorkloadMap, computeSLAMetrics } from '../lib/analyticsUtils';

const STATUS_COLORS = { backlog:'#94a3b8', todo:'#60a5fa', in_progress:'#fbbf24', in_review:'#c084fc', blocked:'#f87171', done:'#34d399', cancelled:'#cbd5e1' };
const PRIORITY_COLORS = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' };
const TOOLTIP_STYLE = { background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:12 };

export default function ProjectDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Project.list('-updated_date', 100).then(p => {
      setProjects(p);
      if (p.length) setSelectedId(p[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Task.filter({ project_id: selectedId }),
      base44.entities.ProjectAssignment.filter({ project_id: selectedId }),
    ]).then(([t, a]) => {
      setTasks(t);
      setAssignments(a);
      setLoading(false);
    });
  }, [selectedId]);

  const project = projects.find(p => p.id === selectedId);
  if (!project && !loading) return <div className="py-20 text-center text-muted-foreground">No projects found. <span className="text-primary cursor-pointer" onClick={() => navigate('/projects')}>Create one</span></div>;

  const openTasks = tasks.filter(t => !['done','cancelled'].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => t.is_overdue).length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  const sla = computeSLAMetrics(tasks);
  const completionTrend = buildCompletionTrend(tasks, 14);
  const statusDist = groupAndCount(tasks, 'status').map(d => ({ ...d, fill: STATUS_COLORS[d.name] || '#94a3b8' }));
  const priorityDist = groupAndCount(tasks, 'priority').map(d => ({ ...d, fill: PRIORITY_COLORS[d.name] || '#94a3b8' }));
  const workload = buildWorkloadMap(tasks).slice(0, 8);

  const ACTIVITY = [
    ...tasks.filter(t => t.is_overdue).map(t => ({ type: 'overdue', msg: `"${t.title}" is overdue`, id: t.id })),
    ...tasks.filter(t => t.status === 'done').slice(0, 3).map(t => ({ type: 'done', msg: `"${t.title}" completed`, id: t.id })),
    ...tasks.filter(t => t.status === 'blocked').map(t => ({ type: 'blocked', msg: `"${t.title}" is blocked`, id: t.id })),
  ].slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deep-dive analytics for a single project</p>
        </div>
        <div className="relative">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="appearance-none pr-8 pl-4 py-2 text-sm font-medium border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {project && (
        <>
          {/* Progress banner */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-foreground">{project.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{project.status?.replace('_',' ')} · {project.priority} priority</p>
              </div>
              <button onClick={() => navigate(`/projects/${project.id}`)} className="text-xs text-primary hover:underline">Open project →</button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${project.completion_percentage || 0}%` }} />
              </div>
              <span className="text-sm font-bold text-primary shrink-0">{project.completion_percentage || 0}%</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Open Tasks" value={openTasks} color="blue" icon={CheckSquare} onClick={() => navigate(`/tasks?project_id=${selectedId}`)} />
            <KPICard title="Completed" value={doneTasks} color="green" icon={TrendingUp} />
            <KPICard title="Overdue" value={overdueTasks} color="red" icon={AlertCircle} onClick={() => navigate(`/tasks?project_id=${selectedId}&status=overdue`)} />
            <KPICard title="Blocked" value={blockedTasks} color="amber" subtitle="Need attention" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="SLA Rate" value={`${sla.rate}%`} color="green" subtitle="On-time completion" />
            <KPICard title="On Time" value={sla.onTime} color="blue" />
            <KPICard title="Late" value={sla.late} color="red" />
            <KPICard title="Team Members" value={assignments.length} color="purple" icon={Users} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Completion Trend" subtitle="Tasks completed per day (14 days)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Done" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <ChartCard title="Status Breakdown">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} innerRadius={35}
                    label={({ name, value }) => value > 0 ? value : ''} labelLine={false}>
                    {statusDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Priority Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={priorityDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[4,4,0,0]} name="Tasks">
                    {priorityDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Workload per Member" subtitle="Click bar to view their tasks">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={workload} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={60} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0,4,4,0]} name="Tasks"
                    onClick={d => navigate(`/tasks?project_id=${selectedId}&assignee=${d.email}`)} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Activity Stream */}
          <ChartCard title="Activity Stream" subtitle="Recent notable events">
            {ACTIVITY.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No notable activity</p>
            ) : (
              <div className="space-y-2">
                {ACTIVITY.map((a, i) => (
                  <div key={i} onClick={() => a.id && navigate(`/tasks/${a.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'overdue' ? 'bg-red-500' : a.type === 'done' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span className="text-sm text-foreground">{a.msg}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${a.type === 'overdue' ? 'bg-red-100 text-red-700' : a.type === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.type}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}