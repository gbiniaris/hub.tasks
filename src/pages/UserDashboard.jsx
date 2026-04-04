import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckSquare, AlertCircle, Clock, Calendar } from 'lucide-react';
import { base44 } from '../api/base44Client';
import KPICard from '../components/dashboard/KPICard';
import ChartCard from '../components/dashboard/ChartCard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { buildCompletionTrend, computeSLAMetrics, avgCompletionDays } from '../lib/analyticsUtils';
import { format, isThisWeek, addDays } from 'date-fns';

const TOOLTIP_STYLE = { background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:12 };

export default function UserDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      const myTasks = await base44.entities.Task.filter({ assigned_to_email: u.email });
      setTasks(myTasks);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const open = tasks.filter(t => !['done','cancelled'].includes(t.status)).length;
  const overdue = tasks.filter(t => t.is_overdue).length;
  const done = tasks.filter(t => t.status === 'done').length;
  const dueThisWeek = tasks.filter(t => t.due_date && isThisWeek(new Date(t.due_date)) && !['done','cancelled'].includes(t.status)).length;
  const sla = computeSLAMetrics(tasks);
  const avgDays = avgCompletionDays(tasks);
  const trend = buildCompletionTrend(tasks, 14);

  const upcoming = tasks
    .filter(t => t.due_date && !['done','cancelled'].includes(t.status))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 8);

  const statusDist = ['backlog','todo','in_progress','in_review','blocked','done'].map(s => ({
    name: s.replace('_',' '),
    value: tasks.filter(t => t.status === s).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
          {user?.full_name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">{user?.full_name} · {user?.email}</p>
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium mt-1.5 inline-block capitalize">{user?.role?.replace(/_/g,' ')}</span>
        </div>
        <button onClick={() => navigate('/my-tasks')} className="text-sm text-primary hover:underline shrink-0">View all my tasks →</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Open Tasks" value={open} color="blue" icon={CheckSquare} onClick={() => navigate('/my-tasks')} />
        <KPICard title="Overdue" value={overdue} color="red" icon={AlertCircle} onClick={() => navigate('/my-tasks')} />
        <KPICard title="Due This Week" value={dueThisWeek} color="amber" icon={Calendar} onClick={() => navigate('/my-tasks')} />
        <KPICard title="Completed" value={done} color="green" icon={CheckSquare} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="SLA Rate" value={`${sla.rate}%`} color="green" subtitle="On-time completion" />
        <KPICard title="On Time" value={sla.onTime} color="blue" />
        <KPICard title="Late" value={sla.late} color="red" />
        <KPICard title="Avg Completion" value={`${avgDays}d`} color="purple" subtitle="Days to close a task" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="My Productivity Trend" subtitle="Tasks I completed (last 14 days)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} name="Done" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="My Tasks by Status">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Upcoming tasks */}
      <ChartCard title="Upcoming Due Dates" subtitle="My open tasks sorted by due date">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming tasks</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(task => (
              <div key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                </div>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <span className={`text-xs shrink-0 font-medium ${task.is_overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}