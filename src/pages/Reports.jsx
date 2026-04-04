import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function Reports() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Task.list('-created_date', 500),
      base44.entities.Project.list('-updated_date', 100),
    ]).then(([t, p]) => { setTasks(t); setProjects(p); setLoading(false); });
  }, []);

  const statusData = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled'].map(s => ({
    name: s.replace('_', ' '),
    count: tasks.filter(t => t.status === s).length,
  }));

  const priorityData = ['critical', 'high', 'medium', 'low'].map(p => ({
    name: p,
    value: tasks.filter(t => t.priority === p).length,
  }));

  const projectHealthData = ['on_track', 'at_risk', 'off_track', 'completed'].map(h => ({
    name: h.replace('_', ' '),
    value: projects.filter(p => p.health === h).length,
  }));

  const Card = ({ title, children }) => (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{t('loading')}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('reports')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Analytics overview across all projects and tasks</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'text-foreground' },
          { label: 'Open Tasks', value: tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length, color: 'text-blue-600' },
          { label: 'Overdue Tasks', value: tasks.filter(t => t.is_overdue).length, color: 'text-red-600' },
          { label: 'Completed Tasks', value: tasks.filter(t => t.status === 'done').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Tasks by Status">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tasks by Priority">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}>
                {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Project Health">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={projectHealthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Projects by Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => ({
                  name: s.replace('_', ' '),
                  value: projects.filter(p => p.status === s).length,
                })).filter(d => d.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {projects.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}