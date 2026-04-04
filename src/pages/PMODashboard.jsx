import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { FolderOpen, AlertCircle, TrendingDown, Users } from 'lucide-react';
import { base44 } from '../api/base44Client';
import KPICard from '../components/dashboard/KPICard';
import ChartCard from '../components/dashboard/ChartCard';
import { buildWorkloadMap, computeSLAMetrics } from '../lib/analyticsUtils';

const HEALTH_COLORS = { on_track:'#22c55e', at_risk:'#f59e0b', off_track:'#ef4444', completed:'#818cf8' };
const TOOLTIP_STYLE = { background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:12 };

export default function PMODashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-updated_date', 200),
      base44.entities.Task.list('-created_date', 1000),
      base44.entities.Team.list('-updated_date', 50),
    ]).then(([p, t, tm]) => { setProjects(p); setTasks(t); setTeams(tm); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const delayedProjects = projects.filter(p => p.health === 'off_track' || p.health === 'at_risk');
  const sla = computeSLAMetrics(tasks);
  const workload = buildWorkloadMap(tasks).slice(0, 12);
  const overloadedUsers = workload.filter(u => u.count > 10).length;

  // Portfolio matrix: each project plotted by completion vs overdue ratio
  const portfolioData = projects.filter(p => p.status !== 'cancelled').map(p => {
    const pTasks = tasks.filter(t => t.project_id === p.id);
    const overdueRatio = pTasks.length ? Math.round((pTasks.filter(t => t.is_overdue).length / pTasks.length) * 100) : 0;
    return {
      name: p.name,
      completion: p.completion_percentage || 0,
      overdue: overdueRatio,
      tasks: pTasks.length,
      health: p.health,
      id: p.id,
    };
  });

  // Delayed project risk data
  const riskData = delayedProjects.map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
    completion: p.completion_percentage || 0,
    health: p.health,
    fill: HEALTH_COLORS[p.health] || '#94a3b8',
    id: p.id,
  }));

  // Cross-project workload (tasks per team via project)
  const teamWorkload = teams.map(tm => {
    const tmProjects = projects.filter(p => p.team_id === tm.id);
    const tmTasks = tasks.filter(t => tmProjects.some(p => p.id === t.project_id));
    return { name: tm.name, tasks: tmTasks.length, open: tmTasks.filter(t => !['done','cancelled'].includes(t.status)).length };
  }).filter(t => t.tasks > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PMO Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Portfolio-level oversight across all projects and resources</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Projects" value={projects.length} color="blue" icon={FolderOpen} drillTo="/projects" />
        <KPICard title="Active Projects" value={activeProjects.length} color="green" drillTo="/projects" />
        <KPICard title="At Risk / Off Track" value={delayedProjects.length} color="red" icon={AlertCircle} subtitle="Need PMO attention" />
        <KPICard title="Overloaded Users" value={overloadedUsers} color="amber" icon={Users} subtitle=">10 open tasks" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Portfolio SLA" value={`${sla.rate}%`} color="green" subtitle="On-time completion rate" />
        <KPICard title="Total Tasks" value={tasks.length} color="slate" />
        <KPICard title="Overdue Tasks" value={tasks.filter(t => t.is_overdue).length} color="red" drillTo="/tasks" />
        <KPICard title="Completion Rate" value={`${tasks.length ? Math.round((tasks.filter(t=>t.status==='done').length/tasks.length)*100) : 0}%`} color="purple" />
      </div>

      {/* Portfolio Table */}
      <ChartCard title="Project Portfolio Overview" subtitle="Full portfolio with health status — click to drill down">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Project','Status','Health','Completion','Overdue %','Tasks'].map(h => (
                  <th key={h} className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {portfolioData.sort((a, b) => {
                const order = { off_track: 0, at_risk: 1, on_track: 2, completed: 3 };
                return (order[a.health] || 2) - (order[b.health] || 2);
              }).map(p => (
                <tr key={p.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/projects/${p.id}`)}>
                  <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                  <td className="py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                      {projects.find(pr => pr.id === p.id)?.status?.replace('_',' ')}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${p.health === 'on_track' ? 'bg-green-100 text-green-700' : p.health === 'at_risk' ? 'bg-amber-100 text-amber-700' : p.health === 'off_track' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {p.health?.replace('_',' ') || '—'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${p.completion}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{p.completion}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className={p.overdue > 20 ? 'text-red-600 font-bold' : p.overdue > 10 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{p.overdue}%</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{p.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delayed projects */}
        <ChartCard title="Delayed Projects" subtitle="At risk or off track — click to open">
          {riskData.length === 0 ? (
            <p className="text-sm text-green-600 text-center py-6 font-medium">✓ All projects on track</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, riskData.length * 36)}>
              <BarChart data={riskData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={90} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Completion']} />
                <Bar dataKey="completion" radius={[0,4,4,0]} name="Completion %"
                  onClick={d => navigate(`/projects/${d.id}`)} style={{ cursor: 'pointer' }}>
                  {riskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Team workload */}
        <ChartCard title="Cross-Project Team Workload" subtitle="Tasks per team across all projects">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={teamWorkload}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="tasks" fill="#6366f1" radius={[4,4,0,0]} name="Total Tasks" />
              <Bar dataKey="open" fill="#3b82f6" radius={[4,4,0,0]} name="Open" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Resource load */}
      <ChartCard title="Resource Load" subtitle="Open task count per assignee across all projects — click to view tasks">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={workload}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" radius={[4,4,0,0]} name="Open Tasks"
              onClick={d => navigate(`/tasks?assignee=${d.email}`)} style={{ cursor: 'pointer' }}>
              {workload.map((d, i) => <Cell key={i} fill={d.count > 10 ? '#ef4444' : d.count > 6 ? '#f59e0b' : '#22c55e'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}