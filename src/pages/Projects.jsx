import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

const HEALTH_COLORS = {
  on_track: 'text-green-600 bg-green-50',
  at_risk: 'text-amber-600 bg-amber-50',
  off_track: 'text-red-600 bg-red-50',
  completed: 'text-indigo-600 bg-indigo-50',
};

export default function Projects() {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const load = () => base44.entities.Project.list('-updated_date', 100).then(setProjects).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('projects')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} projects</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t('createProject')}
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:bg-background outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
        >
          <option value="">{t('allStatuses')}</option>
          {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <FolderOpen className="w-12 h-12 opacity-30" />
          <p className="text-sm">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.project_manager_email?.split('@')[0]}</p>
                </div>
                <div className="shrink-0 ml-2">
                  <StatusBadge status={p.status} />
                </div>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{p.description}</p>}

              <div className="flex items-center justify-between mt-auto">
                <PriorityBadge priority={p.priority} />
                {p.health && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${HEALTH_COLORS[p.health] || 'text-slate-600 bg-slate-50'}`}>
                    {p.health?.replace('_', ' ')}
                  </span>
                )}
              </div>

              {p.completion_percentage !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{t('completion')}</span>
                    <span className="font-semibold">{p.completion_percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.completion_percentage}%` }} />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showModal && <ProjectFormModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function ProjectFormModal({ project, onClose, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', project_manager_email: '', ...project });
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([base44.entities.User.list(), base44.entities.Team.list()]).then(([u, tm]) => { setUsers(u); setTeams(tm); });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (project?.id) { await base44.entities.Project.update(project.id, form); }
    else { await base44.entities.Project.create(form); }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{project?.id ? t('edit') : t('createProject')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('name')} *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('description')}</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('status')}</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('priority')}</label>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('manager')}</label>
              <select className={inputCls} value={form.project_manager_email || ''} onChange={e => set('project_manager_email', e.target.value)}>
                <option value="">Select manager</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('team')}</label>
              <select className={inputCls} value={form.team_id || ''} onChange={e => set('team_id', e.target.value)}>
                <option value="">Select team</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('startDate')}</label>
              <input type="date" className={inputCls} value={form.start_date ? form.start_date.split('T')[0] : ''} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('dueDate')}</label>
              <input type="date" className={inputCls} value={form.end_date ? form.end_date.split('T')[0] : ''} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{t('save')}</Button>
        </div>
      </div>
    </div>
  );
}