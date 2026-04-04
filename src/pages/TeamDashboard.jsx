import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Users, CheckSquare, AlertCircle, ChevronDown } from 'lucide-react';
import { base44 } from '../api/base44Client';
import KPICard from '../components/dashboard/KPICard';
import ChartCard from '../components/dashboard/ChartCard';
import { buildCompletionTrend, buildWorkloadMap, computeSLAMetrics } from '../lib/analyticsUtils';

const TOOLTIP_STYLE = { background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:12 };

export default function TeamDashboard() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Team.list('-updated_date', 50).then(t => {
      setTeams(t);
      if (t.length) setSelectedId(t[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      base44.entities.TeamMembership.filter({ team_id: selectedId, status: 'active' }),
    ]).then(async ([mem]) => {
      setMembers(mem);
      // Fetch tasks for each member
      const emails = mem.map(m => m.user_email).filter(Boolean);
      if (emails.length) {
        const allTasks = await base44.entities.Task.list('-updated_date', 500);
        setTasks(allTasks.filter(t => emails.includes(t.assigned_to_email)));
      } else {
        setTasks([]);
      }
      setLoading(false);
    });
  }, [selectedId]);

  const team = teams.find(t => t.id === selectedId);
  const overdue = tasks.filter(t => t.is_overdue).length;
  const done = tasks.filter(t => t.status === 'done').length;
  const open = tasks.filter(t => !['done','cancelled'].includes(t.status)).length;
  const sla = computeSLAMetrics(tasks);
  const trend = buildCompletionTrend(tasks, 14);
  const workload = buildWorkloadMap(tasks).slice(0, 10);

  // Per-member stats
  const memberStats = members.map(m => {
    const mt = tasks.filter(t => t.assigned_to_email === m.user_email);
    return {
      name: m.user_email?.split('@')[0],
      email: m.user_email,
      total: mt.length,
      done: mt.filter(t => t.status === 'done').length,
      overdue: mt.filter(t => t.is_overdue).length,
      open: mt.filter(t => !['done','cancelled'].includes(t.status)).length,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Workload and productivity by team</p>
        </div>
        <div className="relative">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="appearance-none pr-8 pl-4 py-2 text-sm font-medium border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-ring">
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {team && (
        <>
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{team.name}</h2>
              {team.department && <p className="text-xs text-muted-foreground">{team.department}</p>}
            </div>
            <button onClick={() => navigate(`/teams/${team.id}`)} className="text-xs text-primary hover:underline">Open team →</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Members" value={members.length} color="blue" icon={Users} />
            <KPICard title="Open Tasks" value={open} color="amber" icon={CheckSquare} />
            <KPICard title="Overdue" value={overdue} color="red" icon={AlertCircle} />
            <KPICard title="SLA Rate" value={`${sla.rate}%`} color="green" subtitle="On-time completion" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Productivity Trend" subtitle="Tasks completed last 14 days">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Done" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Workload per Member" subtitle="Click to view their tasks">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workload} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={65} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} name="Tasks"
                    onClick={d => navigate(`/tasks?assignee=${d.email}`)} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Per-member table */}
          <ChartCard title="Member Performance" subtitle="Per-person breakdown — click name to drill down">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Member','Total Tasks','Open','Done','Overdue','On-Time Rate'].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {memberStats.map(m => {
                    const rate = m.done + (tasks.filter(t => t.assigned_to_email === m.email && t.status === 'done' && t.due_date && new Date(t.updated_date) > new Date(t.due_date)).length) > 0
                      ? Math.round((m.done / (m.done || 1)) * 100) : 0;
                    return (
                      <tr key={m.email} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/tasks?assignee=${m.email}`)}>
                        <td className="py-2.5 font-medium text-foreground">{m.name}</td>
                        <td className="py-2.5 text-muted-foreground">{m.total}</td>
                        <td className="py-2.5"><span className="text-blue-600 font-medium">{m.open}</span></td>
                        <td className="py-2.5"><span className="text-green-600 font-medium">{m.done}</span></td>
                        <td className="py-2.5"><span className={m.overdue > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{m.overdue}</span></td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${m.total ? Math.round((m.done/m.total)*100) : 0}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{m.total ? Math.round((m.done/m.total)*100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {memberStats.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No members or tasks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}