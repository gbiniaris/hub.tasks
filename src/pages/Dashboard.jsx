import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FolderOpen, CheckSquare, AlertCircle, TrendingUp, Users, Activity } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import KPICard from '../components/dashboard/KPICard';
import ChartCard from '../components/dashboard/ChartCard';
import { buildCompletionTrend, groupAndCount, buildWorkloadMap, computeSLAMetrics, avgCompletionDays } from '../lib/analyticsUtils';

const STATUS_COLORS = { backlog:'#94a3b8', todo:'#60a5fa', in_progress:'#fbbf24', in_review:'#c084fc', blocked:'#f87171', done:'#34d399', cancelled:'#cbd5e1' };
const PRIORITY_COLORS = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' };
const HEALTH_COLORS = { on_track:'#22c55e', at_risk:'#f59e0b', off_track:'#ef4444', completed:'#818cf8' };
const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

const TOOLTIP_STYLE = { background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:12 };

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Task.list('-created_date', 1000),
      base44.entities.Project.list('-updated_date', 200),
      base44.entities.Team.list('-updated_date', 50),
    ]).then(([tasks, projects, teams]) => {
      const sla = computeSLAMetrics(tasks);
      const completionTrend = buildCompletionTrend(tasks, 14);
      const statusDist = groupAndCount(tasks, 'status').map(d => ({ ...d, fill: STATUS_COLORS[d.name] || '#94a3b8' }));
      const priorityDist = groupAndCount(tasks, 'priority').map(d => ({ ...d, fill: PRIORITY_COLORS[d.name] || '#94a3b8' }));
      const healthDist = groupAndCount(projects, 'health').map(d => ({ name: d.name?.replace('_',' '), value: d.value, fill: HEALTH_COLORS[d.name] || '#94a3b8' }));
      const workload = buildWorkloadMap(tasks).slice(0, 10);
      setData({ tasks, projects, teams, sla, completionTrend, statusDist, priorityDist, healthDist, workload });
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const { tasks, projects, sla, completionTrend, statusDist, priorityDist, healthDist, workload } = data;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const overdueTasks = tasks.filter(t => t.is_overdue).length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const openTasks = tasks.filter(t => !['done','cancelled'].includes(t.status)).length;
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Portfolio overview across all projects and teams</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
          <Activity className="w-3.5 h-3.5" /> Live data
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Projects" value={projects.length} icon={FolderOpen} color="blue" drillTo="/projects" />
        <KPICard title="Active Projects" value={activeProjects} icon={FolderOpen} color="green" drillTo="/projects" />
        <KPICard title="Total Tasks" value={tasks.length} icon={CheckSquare} color="slate" drillTo="/tasks" />
        <KPICard title="Open Tasks" value={openTasks} icon={CheckSquare} color="amber" drillTo="/tasks" />
        <KPICard title="Overdue Tasks" value={overdueTasks} icon={AlertCircle} color="red" drillTo="/tasks?status=overdue" />
        <KPICard title="Completion Rate" value={`${completionRate}%`} icon={TrendingUp} color="purple" subtitle={`${completedTasks} of ${tasks.length} tasks`} />
      </div>

      {/* KPI Row 2 — SLA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="On-Time Completion" value={`${sla.rate}%`} color="green" subtitle={`${sla.onTime} tasks on time`} />
        <KPICard title="Late Completions" value={sla.late} color="red" subtitle="Completed after due date" />
        <KPICard title="SLA Tracked Tasks" value={sla.total} color="blue" subtitle="Tasks with due dates" />
        <KPICard title="Overdue Rate" value={tasks.length ? `${Math.round((overdueTasks/tasks.length)*100)}%` : '0%'} color={overdueTasks > 0 ? 'red' : 'green'} subtitle={`${overdueTasks} tasks past due`} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Task Completion Trend" subtitle="Tasks completed per day (last 14 days)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Project Health" subtitle="Distribution across portfolio">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={healthDist} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={75} innerRadius={40}
                label={({ name, value }) => value > 0 ? `${value}` : ''} labelLine={false}>
                {healthDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Tasks by Status" subtitle="Current distribution">
          <div className="grid grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Tasks">
                  {statusDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={40}
                  label={({ name, value }) => value > 0 ? `${value}` : ''} labelLine={false}>
                  {statusDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Tasks">
                {priorityDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Workload Distribution */}
      <ChartCard title="Workload by Assignee" subtitle="Open tasks per user — click to view tasks">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={workload}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n, p) => [v, 'Tasks']} labelFormatter={l => `User: ${l}`} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Open Tasks"
              onClick={(d) => navigate(`/tasks?assignee=${d.email}`)} style={{ cursor: 'pointer' }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Projects table */}
      <ChartCard title="Project Portfolio" subtitle="All projects with health status — click to drill down">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">Project</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">Health</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">Completion</th>
                <th className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.projects.slice(0, 10).map(p => (
                <tr key={p.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/projects/${p.id}`)}>
                  <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                  <td className="py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{p.status?.replace('_',' ')}</span>
                  </td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.health === 'on_track' ? 'bg-green-100 text-green-700' : p.health === 'at_risk' ? 'bg-amber-100 text-amber-700' : p.health === 'off_track' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {p.health?.replace('_',' ') || '—'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.completion_percentage || 0}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{p.completion_percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{p.project_manager_email?.split('@')[0] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}