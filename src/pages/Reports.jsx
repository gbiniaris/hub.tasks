import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, Filter, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { computeSLAMetrics, buildWorkloadMap, avgCompletionDays } from '../lib/analyticsUtils';
import { format } from 'date-fns';

const REPORT_TYPES = [
  { id: 'task_detail',        label: 'Task Detail Report' },
  { id: 'overdue',            label: 'Overdue Tasks Report' },
  { id: 'project_performance',label: 'Project Performance' },
  { id: 'team_performance',   label: 'Team Performance' },
  { id: 'user_performance',   label: 'User Performance' },
  { id: 'sla_compliance',     label: 'SLA / Deadline Compliance' },
  { id: 'workload',           label: 'Workload Distribution' },
  { id: 'task_history',       label: 'Task History Report' },
];

const TOOLTIP_STYLE = { background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:12 };
const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

export default function Reports() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeReport, setActiveReport] = useState('task_detail');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ field: 'created_date', dir: 'desc' });
  const [filters, setFilters] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Task.list('-created_date', 1000),
      base44.entities.Project.list('-updated_date', 100),
      base44.entities.Team.list('-updated_date', 50),
      base44.entities.User.list('-created_date', 100),
    ]).then(([t, p, tm, u]) => { setTasks(t); setProjects(p); setTeams(tm); setUsers(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (activeReport === 'task_history') {
      base44.entities.TaskHistory.list('-created_date', 500).then(setHistory);
    }
  }, [activeReport]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v || undefined }));
  const clearFilters = () => setFilters({});
  const hasFilters = Object.values(filters).some(Boolean);

  const toggleSort = (field) => setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  const SortIcon = ({ field }) => sort.field === field
    ? (sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronDown className="w-3 h-3 opacity-30" />;
  const Th = ({ field, label }) => (
    <th onClick={() => toggleSort(field)} className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground">
      <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
    </th>
  );

  const filteredTasks = useMemo(() => {
    let t = [...tasks];
    if (filters.status) t = t.filter(x => x.status === filters.status);
    if (filters.priority) t = t.filter(x => x.priority === filters.priority);
    if (filters.project_id) t = t.filter(x => x.project_id === filters.project_id);
    if (filters.assigned_to_email) t = t.filter(x => x.assigned_to_email === filters.assigned_to_email);
    if (activeReport === 'overdue') t = t.filter(x => x.is_overdue);
    return t.sort((a, b) => {
      const v1 = a[sort.field] ?? ''; const v2 = b[sort.field] ?? '';
      const c = v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
  }, [tasks, filters, sort, activeReport]);

  const projectSLA = useMemo(() => projects.map(p => {
    const pt = tasks.filter(t => t.project_id === p.id);
    const sla = computeSLAMetrics(pt);
    return { name: p.name, id: p.id, total: pt.length, onTime: sla.onTime, late: sla.late, rate: sla.rate, overdue: pt.filter(t => t.is_overdue).length };
  }).sort((a, b) => a.rate - b.rate), [projects, tasks]);

  const workload = useMemo(() => buildWorkloadMap(tasks), [tasks]);

  const userPerf = useMemo(() => users.map(u => {
    const ut = tasks.filter(t => t.assigned_to_email === u.email);
    const sla = computeSLAMetrics(ut);
    const avg = avgCompletionDays(ut);
    return { name: u.full_name || u.email?.split('@')[0], email: u.email, total: ut.length, done: ut.filter(t => t.status === 'done').length, overdue: ut.filter(t => t.is_overdue).length, sla: sla.rate, avg };
  }).filter(u => u.total > 0).sort((a, b) => b.total - a.total), [users, tasks]);

  const teamPerf = useMemo(() => teams.map(tm => {
    const tmProjects = projects.filter(p => p.team_id === tm.id);
    const tmTasks = tasks.filter(t => tmProjects.some(p => p.id === t.project_id));
    const sla = computeSLAMetrics(tmTasks);
    return { name: tm.name, id: tm.id, total: tmTasks.length, done: tmTasks.filter(t => t.status === 'done').length, overdue: tmTasks.filter(t => t.is_overdue).length, sla: sla.rate };
  }).filter(t => t.total > 0), [teams, projects, tasks]);

  const Select = ({ label, value, onChange, options }) => (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background">
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reports')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate, filter, and drill down into operational data</p>
        </div>
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
      {['task_detail','overdue','sla_compliance'].includes(activeReport) && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select label="All Statuses" value={filters.status} onChange={v => setFilter('status', v)}
            options={['backlog','todo','in_progress','in_review','blocked','done','cancelled'].map(s => ({ value: s, label: s.replace('_',' ') }))} />
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
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">{t('loading')}</div>
      ) : (
        <>
          {/* TASK DETAIL / OVERDUE */}
          {(activeReport === 'task_detail' || activeReport === 'overdue') && (
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
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.slice(0, 100).map(task => (
                      <tr key={task.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {task.is_overdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                            <span className="font-medium text-foreground truncate max-w-48">{task.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                        <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{task.assigned_to_email?.split('@')[0] || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          {task.due_date ? <span className={task.is_overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>{format(new Date(task.due_date), 'MMM d, yyyy')}</span> : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{projects.find(p => p.id === task.project_id)?.name || '—'}</td>
                        <td className="px-4 py-3"><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></td>
                      </tr>
                    ))}
                    {filteredTasks.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">{t('noResults')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROJECT PERFORMANCE */}
          {activeReport === 'project_performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Completion by Project</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={projects.slice(0,12).map(p => ({ name: p.name.slice(0,12), value: p.completion_percentage || 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" domain={[0,100]} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Completion']} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} name="Completion" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Project Health Distribution</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={['on_track','at_risk','off_track','completed'].map(h => ({ name: h.replace('_',' '), value: projects.filter(p => p.health === h).length })).filter(d => d.value > 0)}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ name, value }) => value > 0 ? `${value}` : ''} labelLine={false}>
                        {['#22c55e','#f59e0b','#ef4444','#818cf8'].map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Project','Status','Health','Completion','Tasks','PM'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projects.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${p.health === 'on_track' ? 'bg-green-100 text-green-700' : p.health === 'at_risk' ? 'bg-amber-100 text-amber-700' : p.health === 'off_track' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>{p.health?.replace('_',' ') || '—'}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${p.completion_percentage || 0}%` }} /></div>
                            <span className="text-xs text-muted-foreground">{p.completion_percentage || 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tasks.filter(t => t.project_id === p.id).length}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.project_manager_email?.split('@')[0] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEAM PERFORMANCE */}
          {activeReport === 'team_performance' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Team Task Volume</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={teamPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} name="Total Tasks" />
                    <Bar dataKey="done" fill="#10b981" radius={[4,4,0,0]} name="Done" />
                    <Bar dataKey="overdue" fill="#ef4444" radius={[4,4,0,0]} name="Overdue" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>{['Team','Total','Done','Overdue','SLA Rate'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {teamPerf.map(tm => (
                      <tr key={tm.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/teams/${tm.id}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{tm.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{tm.total}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{tm.done}</td>
                        <td className="px-4 py-3"><span className={tm.overdue > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{tm.overdue}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${tm.sla}%` }} /></div>
                            <span className="text-xs font-medium">{tm.sla}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USER PERFORMANCE */}
          {activeReport === 'user_performance' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>{['User','Total Tasks','Completed','Overdue','SLA Rate','Avg Days'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {userPerf.map(u => (
                    <tr key={u.email} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/tasks?assignee=${u.email}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{u.name?.charAt(0)?.toUpperCase()}</div>
                          <span className="font-medium text-foreground">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.total}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{u.done}</td>
                      <td className="px-4 py-3"><span className={u.overdue > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{u.overdue}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${u.sla}%` }} /></div>
                          <span className="text-xs font-medium">{u.sla}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.avg}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SLA COMPLIANCE */}
          {activeReport === 'sla_compliance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => { const s = computeSLAMetrics(filteredTasks); return [
                  { label: 'SLA Rate', value: `${s.rate}%`, color: s.rate >= 80 ? 'text-green-600' : s.rate >= 60 ? 'text-amber-600' : 'text-red-600' },
                  { label: 'On Time', value: s.onTime, color: 'text-green-600' },
                  { label: 'Late', value: s.late, color: 'text-red-600' },
                  { label: 'Total Tracked', value: s.total, color: 'text-foreground' },
                ]; })().map(k => (
                  <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                    <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">SLA by Project</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectSLA.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" domain={[0,100]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'On-Time Rate']} />
                    <Bar dataKey="rate" radius={[4,4,0,0]} name="SLA Rate">
                      {projectSLA.slice(0,12).map((d, i) => <Cell key={i} fill={d.rate >= 80 ? '#22c55e' : d.rate >= 60 ? '#f59e0b' : '#ef4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>{['Project','Total','On Time','Late','SLA Rate','Overdue'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {projectSLA.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.total}</td>
                        <td className="px-4 py-3 text-green-600">{p.onTime}</td>
                        <td className="px-4 py-3 text-red-600">{p.late}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${p.rate >= 80 ? 'text-green-600' : p.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{p.rate}%</span></td>
                        <td className="px-4 py-3"><span className={p.overdue > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{p.overdue}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WORKLOAD */}
          {activeReport === 'workload' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Open Tasks per Assignee</h3>
                <ResponsiveContainer width="100%" height={260}>
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
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>{['Assignee','Open Tasks','Load Level'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">
                    {workload.map(u => (
                      <tr key={u.email} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/tasks?assignee=${u.email}`)}>
                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-3"><span className={`font-bold ${u.count > 10 ? 'text-red-600' : u.count > 6 ? 'text-amber-600' : 'text-green-600'}`}>{u.count}</span></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.count > 10 ? 'bg-red-100 text-red-700' : u.count > 6 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {u.count > 10 ? 'Overloaded' : u.count > 6 ? 'High' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TASK HISTORY */}
          {activeReport === 'task_history' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>{['Task','Field','From','To','Changed By','When'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {history.slice(0, 100).map(h => (
                    <tr key={h.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => h.task_id && navigate(`/tasks/${h.task_id}`)}>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{h.task_id?.slice(-8)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{h.field_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{h.old_value || '—'}</td>
                      <td className="px-4 py-3 text-xs text-foreground font-medium">{h.new_value || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{h.changed_by_email?.split('@')[0]}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{h.created_date ? format(new Date(h.created_date), 'MMM d, HH:mm') : '—'}</td>
                    </tr>
                  ))}
                  {history.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No history records</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}