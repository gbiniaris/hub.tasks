import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';

const ROLES = ['super_admin', 'admin', 'project_manager', 'team_manager', 'team_lead', 'contributor', 'viewer'];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.User.filter({ id }),
    ]).then(([users]) => {
      const u = users[0];
      setUser(u);
      setForm({ role: u?.role, department: u?.department || '', job_title: u?.job_title || '', phone: u?.phone || '', status: u?.status || 'active' });
      if (u) base44.entities.Task.filter({ assigned_to_email: u.email }).then(setTasks);
      setLoading(false);
    });
  }, [id]);

  const save = async () => {
    setSaving(true);
    await base44.entities.User.update(id, form);
    setSaving(false);
  };

  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <div className="text-center text-muted-foreground py-20">User not found</div>;

  const openTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status)).length;
  const overdueTasks = tasks.filter(t => t.is_overdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/users')} className="mt-1 p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{user.full_name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('save')}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'text-foreground' },
          { label: t('openTasks'), value: openTasks, color: 'text-blue-600' },
          { label: t('overdueTasks'), value: overdueTasks, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">{t('edit')} Details</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('role')}</label>
            <select className={inputCls} value={form.role || ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('department')}</label>
            <input className={inputCls} value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('jobTitle')}</label>
            <input className={inputCls} value={form.job_title || ''} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('phone')}</label>
            <input className={inputCls} value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('status')}</label>
            <select className={inputCls} value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Assigned Tasks ({tasks.length})</h3>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {tasks.slice(0, 20).map(task => (
              <div key={task.id} className="px-5 py-3">
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.status === 'done' ? 'bg-green-100 text-green-700' : task.is_overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No tasks assigned</div>}
          </div>
        </div>
      </div>
    </div>
  );
}