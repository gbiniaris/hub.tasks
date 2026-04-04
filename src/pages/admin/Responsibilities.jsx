import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { base44 } from '../../api/base44Client';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import PriorityBadge from '../../components/PriorityBadge';

export default function Responsibilities() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState(null);

  const load = async () => {
    const q = teamFilter ? { team_id: teamFilter } : {};
    const [resp, tms] = await Promise.all([
      Object.keys(q).length ? base44.entities.Responsibility.filter(q) : base44.entities.Responsibility.list('-created_date', 100),
      base44.entities.Team.list('-updated_date', 50),
    ]);
    setItems(resp);
    setTeams(tms);
  };
  useEffect(() => { load(); }, [teamFilter]);

  const STATUS_COLORS = {
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-indigo-100 text-indigo-700',
    archived: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('responsibilities')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} defined</p>
        </div>
        <Button onClick={() => { setEdit(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background">
          <option value="">{t('allTeams')}</option>
          {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('name')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('team')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('assignee')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('priority')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(r => {
              const team = teams.find(tm => tm.id === r.team_id);
              return (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{team?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.assigned_to_email?.split('@')[0] || '—'}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEdit(r); setShowModal(true); }} className="text-xs text-primary hover:underline">{t('edit')}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">{t('noResults')}</div>}
      </div>

      {showModal && <ResponsibilityModal item={edit} teams={teams} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function ResponsibilityModal({ item, teams, onClose, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', description: '', team_id: '', assigned_to_email: '', priority: 'medium', status: 'active', ...item });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => { base44.entities.User.list().then(setUsers); }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    if (item?.id) { await base44.entities.Responsibility.update(item.id, form); }
    else { await base44.entities.Responsibility.create(form); }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{item?.id ? t('edit') : 'Add'} {t('responsibilities')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('team')}</label>
              <select className={inputCls} value={form.team_id || ''} onChange={e => set('team_id', e.target.value)}>
                <option value="">Select team</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('assignee')}</label>
              <select className={inputCls} value={form.assigned_to_email || ''} onChange={e => set('assigned_to_email', e.target.value)}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('priority')}</label>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('status')}</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {['active', 'on_hold', 'completed', 'archived'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{t('save')}</Button>
        </div>
      </div>
    </div>
  );
}