import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { Filter, X, ChevronDown, ChevronUp, ExternalLink, AlertCircle, CheckCircle2, Clock, Layers } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { Button } from '../components/ui/button';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { format, differenceInDays, subDays, startOfDay } from 'date-fns';

const REPORT_TYPES = [
  { id: 'overview',            label: 'Overview' },
  { id: 'task_detail',         label: 'Task Detail' },
  { id: 'overdue',             label: 'Overdue Tasks' },
  { id: 'project_performance', label: 'Project Performance' },
  { id: 'team_performance',    label: 'Team Performance' },
  { id: 'user_performance',    label: 'User Performance' },
  { id: 'workload',            label: 'Workload Distribution' },
];

const TOOLTIP_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };
const STATUS_COLORS = { backlog: '#94a3b8', todo: '#3b82f6', in_progress: '#f59e0b', in_review: '#8b5cf6', blocked: '#ef4444', done: '#22c55e', cancelled: '#cbd5e1' };

function KPICard({ icon: IconComp, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    red:    'bg-red-50 text-red-700 border-red-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</span>
        {IconComp && <IconComp className="w-4 h-4 opacity-60" />}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ field: 'due_date', dir: 'asc' });
  const [filters, setFilters] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Task.list('-created_date', 1000),
      base44.entities.Project.list('-updated_date', 100),
      base44.entities.Team.list('-updated_date', 50),
      base44.entities.User.list('-created_date', 100).catch(() => []),
    ]).then(([t, p, tm, u]) => {
      setTasks(t);
      setProjects(p);
      setTeams(tm);
      // If User list failed (403), derive unique users from tasks
      if (u.length === 0) {
        const emailSet = [...new Set(t.map(x => x.assigned_to_email).filter(Boolean))];
        setUsers(emailSet.map(email => ({ id: email, email, full_name: email.split('@')[0] })));
      } else {
        setUsers(u);
      }
      setLoading(false);
    });
  }, []);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v || undefined }));
  const clearFilters = () => setFilters({});
  const hasFilters = Object.values(filters).some(Boolean);

  const toggleSort = (field) => setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  const SortIcon = ({ field }) => sort.field === field
    ? (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronDown className="w-3 h-3 opacity-30" />;
  const Th = ({ field, label }) => (
    <th onClick={() => toggleSort(field)} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground">
      <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
    </th>
  );

  // ── Filtered / sorted task list ──
  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (filters.status) list = list.filter(x => x.status === filters.status);
    if (filters.priority) list = list.filter(x => x.priority === filters.priority);
    if (filters.project_id) list = list.filter(x => x.project_id === filters.project_id);
    if (filters.assigned_to_email) list = list.filter(x => x.assigned_to_email === filters.assigned_to_email);
    if (activeReport === 'overdue') list = list.filter(x => x.is_overdue || (x.due_date && new Date(x.due_date) < new Date() && x.status !== 'done' && x.status !== 'cancelled'));
    return list.sort((a, b) => {
      const v1 = a[sort.field] ?? ''; const v2 = b[sort.field] ?? '';
      const c = v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
  }, [tasks, filters, sort, activeReport]);

  // ── Overview metrics ──
  const overview = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done');
    const overdue = tasks.filter(t => t.is_overdue || (t.due_date && new Date(t.due_date) < new Date() && !['done','cancelled'].includes(t.status)));
    const blocked = tasks.filter(t => t.status === 'blocked');
    const statusDist = Object.entries(
      tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
    ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value, color: STATUS_COLORS[name] || '#94a3b8' }));
    const priorityDist = ['critical','high','medium','low'].map(p => ({
      name: p, value: tasks.filter(t => t.priority === p).length,
    })).filter(d => d.value > 0);
    const trend = Array.from({ length: 14 }, (_, i) => {
      const day = startOfDay(subDays(new Date(), 13 - i));
      return {
        date: format(day, 'MMM d'),
        created: tasks.filter(t => t.created_date && startOfDay(new Date(t.created_date)).getTime() === day.getTime()).length,
        done: tasks.filter(t => t.status === 'done' && t.updated_date && startOfDay(new Date(t.updated_date)).getTime() === day.getTime()).length,
      };
    });
    return { total: tasks.length, done: done.length, overdue: overdue.length, blocked: blocked.length, statusDist, priorityDist, trend };
  }, [tasks]);

  // ── Project performance ──
  const projectPerf = useMemo(() => projects.map(p => {
    const pt = tasks.filter(t => t.project_id === p.id);
    const done = pt.filter(t => t.status === 'done').length;
    const overdue = pt.filter(t => t.is_overdue || (t.due_date && new Date(t.due_date) < new Date() && !['done','cancelled'].includes(t.status))).length;
    return { ...p, taskCount: pt.length, done, overdue };
  }), [projects, tasks]);

  // ── Team performance ──
  const teamPerf = useMemo(() => teams.map(tm => {
    const tmProjects = projects.filter(p => p.team_id === tm.id);
    const tmTasks = tasks.filter(t => tmProjects.some(p => p.id === t.project_id));
    const done = tmTasks.filter(t => t.status === 'done').length;
    const overdue = tmTasks.filter(t => t.is_overdue || (t.due_date && new Date(t.due_date) < new Date() && !['done','cancelled'].includes(t.status))).length;
    const inProgress = tmTasks.filter(t => t.status === 'in_progress').length;
    return { id: tm.id, name: tm.name, total: tmTasks.length, done, overdue, inProgress, projectCount: tmProjects.length };
  }).filter(t => t.total > 0 || t.projectCount > 0), [teams, projects, tasks]);

  // ── User performance ──
  const userPerf = useMemo(() => users.map(u => {
    const ut = tasks.filter(t => t.assigned_to_email === u.email);
    const done = ut.filter(t => t.status === 'done').length;
    const overdue = ut.filter(t => t.is_overdue || (t.due_date && new Date(t.due_date) < new Date() && !['done','cancelled'].includes(t.status))).length;
    const inProgress = ut.filter(t => t.status === 'in_progress').length;
    const doneTasks = ut.filter(t => t.status === 'done' && t.created_date && t.updated_date);
    const avgDays = doneTasks.length ? Math.round(doneTasks.reduce((sum, t) => sum + differenceInDays(new Date(t.updated_date), new Date(t.created_date)), 0) / doneTasks.length) : null;
    const rate = ut.length ? Math.round((done / ut.length) * 100) : 0;
    return { id: u.id, name: u.full_name || u.email?.split('@')[0] || u.email, email: u.email, total: ut.length, done, overdue, inProgress, rate, avgDays };
  }).filter(u => u.total > 0).sort((a, b) => b.total - a.total), [users, tasks]);

  // ── Workload ──
  const workload = useMemo(() => {
    const open = tasks.filter(t => !['done','cancelled'].includes(t.status));
    const map = {};
    open.forEach(t => {
      if (t.assigned_to_email) {
        if (!map[t.assigned_to_email]) map[t.assigned_to_email] = { email: t.assigned_to_email, name: t.assigned_to_email.split('@')[0], count: 0, critical: 0, high: 0 };
        map[t.assigned_to_email].count++;
        if (t.priority === 'critical') map[t.assigned_to_email].critical++;
        if (t.priority === 'high') map[t.assigned_to_email].high++;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [tasks]);

  const Select = ({ label, value, onChange, options }) => (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground">
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const showFilters = ['task_detail','overdue'].includes(activeReport);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Operational analytics across tasks, projects, and teams</p>
      </div>

      {/* Report selector */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(r => (
          <button key={r.id} onClick={() => { setActiveReport(r.id); clearFilters(); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${activeReport === r.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select label="All Statuses" value={filters.status} onChange={v => setFilter('status', v)}
            options={['backlog','todo','in_progress','in_review','blocked','done','cancelled'].map(s => ({ value: s, label: s.replace(/_/g,' ') }))} />
          <Select label="All Priorities" value={filters.priority} onChange={v => setFilter('priority', v)}
            options={['critical','high','medium','low'].map(p => ({ value: p, label: p }))} />
          <Select label="All Projects" value={filters.project_id} onChange={v => setFilter('project_id', v)}
            options={projects.map(p => ({ value: p.id, label: p.name }))} />
          <Select label="All Users" value={filters.assigned_to_email} onChange={v => setFilter('assigned_to_email', v)}
            options={users.map(u => ({ value: u.email, label: u.full_name || u.email }))} />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filteredTasks.length} rows</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading data…</div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeReport === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={Layers} label="Total Tasks" value={overview.total} color="blue" />
                <KPICard icon={CheckCircle2} label="Completed" value={overview.done} sub={`${overview.total ? Math.round(overview.done/overview.total*100) : 0}% of total`} color="green" />
                <KPICard icon={AlertCircle} label="Overdue" value={overview.overdue} color="red" />
                <KPICard icon={Clock} label="Blocked" value={overview.blocked} color="amber" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={overview.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={2}
                        label={({ value }) => value > 0 ? value : ''} labelLine={false}>
                        {overview.statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Priority Breakdown</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={overview.priorityDist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={60} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" radius={[0,4,4,0]} name="Tasks">
                        {overview.priorityDist.map((d, i) => {
                          const c = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };
                          return <Cell key={i} fill={c[d.name] || '#94a3b8'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Activity — Last 14 Days</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={overview.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="created" name="Created" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="done" name="Completed" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Project Summary</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{['Project','Status','Health','Progress','Tasks','Overdue'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectPerf.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${p.health==='on_track'?'bg-green-100 text-green-700':p.health==='at_risk'?'bg-amber-100 text-amber-700':p.health==='off_track'?'bg-red-100 text-red-700':'bg-indigo-100 text-indigo-700'}`}>
                            {p.health?.replace(/_/g,' ')||'—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width:`${p.completion_percentage||0}%` }} /></div>
                            <span className="text-xs text-muted-foreground">{p.completion_percentage||0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.taskCount}</td>
                        <td className="px-4 py-3"><span className={p.overdue>0?'text-red-600 font-medium':'text-muted-foreground'}>{p.overdue}</span></td>
                      </tr>
                    ))}
                    {projectPerf.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No projects found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TASK DETAIL / OVERDUE */}
          {(activeReport==='task_detail'||activeReport==='overdue') && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <Th field="title" label="Task" />
                      <Th field="status" label="Status" />
                      <Th field="priority" label="Priority" />
                      <Th field="assigned_to_email" label="Assignee" />
                      <Th field="due_date" label="Due Date" />
                      <Th field="project_id" label="Project" />
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.slice(0,200).map(task => {
                      const isOverdue = task.is_overdue||(task.due_date&&new Date(task.due_date)<new Date()&&!['done','cancelled'].includes(task.status));
                      return (
                        <tr key={task.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                              <span className="font-medium text-foreground">{task.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                          <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{task.assigned_to_email?.split('@')[0]||'—'}</td>
                          <td className="px-4 py-3 text-xs">
                            {task.due_date ? <span className={isOverdue?'text-red-600 font-semibold':'text-muted-foreground'}>{format(new Date(task.due_date),'MMM d, yyyy')}</span> : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{projects.find(p=>p.id===task.project_id)?.name||'—'}</td>
                          <td className="px-4 py-3"><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></td>
                        </tr>
                      );
                    })}
                    {filteredTasks.length===0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No tasks match your filters</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROJECT PERFORMANCE */}
          {activeReport==='project_performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Completion % by Project</h3>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={projectPerf.map(p=>({name:p.name.length>14?p.name.slice(0,14)+'…':p.name, pct:p.completion_percentage||0}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{fontSize:9,fill:'hsl(var(--muted-foreground))'}} />
                      <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} unit="%" domain={[0,100]} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>[`${v}%`,'Completion']} />
                      <Bar dataKey="pct" fill="#3b82f6" radius={[4,4,0,0]} name="Completion %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Tasks by Project</h3>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={projectPerf.map(p=>({name:p.name.length>14?p.name.slice(0,14)+'…':p.name,total:p.taskCount,done:p.done,overdue:p.overdue}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{fontSize:9,fill:'hsl(var(--muted-foreground))'}} />
                      <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}} />
                      <Bar dataKey="total" fill="#94a3b8" radius={[4,4,0,0]} name="Total" />
                      <Bar dataKey="done" fill="#22c55e" radius={[4,4,0,0]} name="Done" />
                      <Bar dataKey="overdue" fill="#ef4444" radius={[4,4,0,0]} name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{['Project','Status','Health','Progress','Tasks','Done','Overdue','PM'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectPerf.map(p=>(
                      <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={()=>navigate(`/projects/${p.id}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${p.health==='on_track'?'bg-green-100 text-green-700':p.health==='at_risk'?'bg-amber-100 text-amber-700':p.health==='off_track'?'bg-red-100 text-red-700':'bg-indigo-100 text-indigo-700'}`}>{p.health?.replace(/_/g,' ')||'—'}</span></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${p.completion_percentage||0}%`}} /></div><span className="text-xs text-muted-foreground">{p.completion_percentage||0}%</span></div></td>
                        <td className="px-4 py-3 text-muted-foreground">{p.taskCount}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{p.done}</td>
                        <td className="px-4 py-3"><span className={p.overdue>0?'text-red-600 font-medium':'text-muted-foreground'}>{p.overdue}</span></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.project_manager_email?.split('@')[0]||'—'}</td>
                      </tr>
                    ))}
                    {projectPerf.length===0&&<tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No projects found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEAM PERFORMANCE */}
          {activeReport==='team_performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Task Volume by Team</h3>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={teamPerf}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} />
                      <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}} />
                      <Bar dataKey="total" fill="#94a3b8" radius={[4,4,0,0]} name="Total" />
                      <Bar dataKey="done" fill="#22c55e" radius={[4,4,0,0]} name="Done" />
                      <Bar dataKey="inProgress" fill="#f59e0b" radius={[4,4,0,0]} name="In Progress" />
                      <Bar dataKey="overdue" fill="#ef4444" radius={[4,4,0,0]} name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Completion Rate by Team</h3>
                  <div className="space-y-4 mt-2">
                    {teamPerf.map(tm=>{
                      const rate=tm.total?Math.round((tm.done/tm.total)*100):0;
                      return (
                        <div key={tm.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{tm.name}</span>
                            <span className="text-sm font-bold text-foreground">{rate}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${rate}%`,background:rate>=70?'#22c55e':rate>=40?'#f59e0b':'#ef4444'}} />
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{tm.total} tasks</span><span>{tm.done} done</span>
                            {tm.overdue>0&&<span className="text-red-500">{tm.overdue} overdue</span>}
                          </div>
                        </div>
                      );
                    })}
                    {teamPerf.length===0&&<p className="text-sm text-muted-foreground text-center py-8">No team data available</p>}
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{['Team','Projects','Total','Done','In Progress','Overdue','Rate'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamPerf.map(tm=>{
                      const rate=tm.total?Math.round((tm.done/tm.total)*100):0;
                      return (
                        <tr key={tm.id} className="hover:bg-muted/30 cursor-pointer" onClick={()=>navigate(`/teams/${tm.id}`)}>
                          <td className="px-4 py-3 font-medium text-foreground">{tm.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{tm.projectCount}</td>
                          <td className="px-4 py-3 text-muted-foreground">{tm.total}</td>
                          <td className="px-4 py-3 text-green-600 font-medium">{tm.done}</td>
                          <td className="px-4 py-3 text-amber-600">{tm.inProgress}</td>
                          <td className="px-4 py-3"><span className={tm.overdue>0?'text-red-600 font-medium':'text-muted-foreground'}>{tm.overdue}</span></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${rate}%`,background:rate>=70?'#22c55e':rate>=40?'#f59e0b':'#ef4444'}} /></div><span className="text-xs font-medium">{rate}%</span></div></td>
                        </tr>
                      );
                    })}
                    {teamPerf.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No team data available</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USER PERFORMANCE */}
          {activeReport==='user_performance' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Task Load per User</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={userPerf.slice(0,15).map(u=>({name:u.name,total:u.total,done:u.done,overdue:u.overdue}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} />
                    <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}} />
                    <Bar dataKey="total" fill="#94a3b8" radius={[4,4,0,0]} name="Total" />
                    <Bar dataKey="done" fill="#22c55e" radius={[4,4,0,0]} name="Done" />
                    <Bar dataKey="overdue" fill="#ef4444" radius={[4,4,0,0]} name="Overdue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{['User','Total','Done','In Progress','Overdue','Done Rate','Avg Days'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {userPerf.map(u=>(
                      <tr key={u.email} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{u.name?.charAt(0)?.toUpperCase()}</div>
                            <div><div className="font-medium text-foreground">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.total}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{u.done}</td>
                        <td className="px-4 py-3 text-amber-600">{u.inProgress}</td>
                        <td className="px-4 py-3"><span className={u.overdue>0?'text-red-600 font-medium':'text-muted-foreground'}>{u.overdue}</span></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${u.rate}%`,background:u.rate>=70?'#22c55e':u.rate>=40?'#f59e0b':'#ef4444'}} /></div><span className="text-xs font-medium">{u.rate}%</span></div></td>
                        <td className="px-4 py-3 text-muted-foreground">{u.avgDays!==null?`${u.avgDays}d`:'—'}</td>
                      </tr>
                    ))}
                    {userPerf.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No user data available</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKLOAD */}
          {activeReport==='workload' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Open Tasks per Assignee</h3>
                <p className="text-xs text-muted-foreground mb-4">Excludes done and cancelled tasks</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={workload}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} />
                    <YAxis tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[4,4,0,0]} name="Open Tasks">
                      {workload.map((d,i)=><Cell key={i} fill={d.count>10?'#ef4444':d.count>5?'#f59e0b':'#22c55e'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{['Assignee','Email','Open Tasks','Critical','High','Load Level'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {workload.map(u=>(
                      <tr key={u.email} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${u.count>10?'text-red-600':u.count>5?'text-amber-600':'text-green-600'}`}>{u.count}</span></td>
                        <td className="px-4 py-3"><span className={u.critical>0?'text-red-600 font-medium':'text-muted-foreground'}>{u.critical}</span></td>
                        <td className="px-4 py-3"><span className={u.high>0?'text-orange-500':'text-muted-foreground'}>{u.high}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.count>10?'bg-red-100 text-red-700':u.count>5?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{u.count>10?'Overloaded':u.count>5?'High':'Normal'}</span></td>
                      </tr>
                    ))}
                    {workload.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No open tasks assigned</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}