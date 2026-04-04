import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, Users } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import StatusBadge from '../components/StatusBadge';

export default function Teams() {
  const { t } = useI18n();
  const [teams, setTeams] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    const [tms, mem] = await Promise.all([
      base44.entities.Team.list('-updated_date', 50),
      base44.entities.TeamMembership.filter({ status: 'active' }),
    ]);
    setTeams(tms);
    setMemberships(mem);
  };
  useEffect(() => { load(); }, []);

  const getMemberCount = (teamId) => memberships.filter(m => m.team_id === teamId).length;

  const filtered = teams.filter(tm =>
    !search || tm.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('teams')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} teams</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t('createTeam')}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(tm => (
          <Link key={tm.id} to={`/teams/${tm.id}`} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {tm.name?.charAt(0)}
              </div>
              <StatusBadge status={tm.status === 'active' ? 'active' : 'cancelled'} />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{tm.name}</h3>
            {tm.department && <p className="text-xs text-muted-foreground mt-0.5">{tm.department}</p>}
            {tm.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tm.description}</p>}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{getMemberCount(tm.id)} {t('members')}</span>
              </div>
              {tm.manager_email && (
                <div className="text-xs text-muted-foreground truncate">
                  {t('manager')}: {tm.manager_email.split('@')[0]}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {showModal && <TeamFormModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function TeamFormModal({ team, onClose, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', description: '', department: '', status: 'active', manager_email: '', ...team });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => { base44.entities.User.list().then(setUsers); }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (team?.id) { await base44.entities.Team.update(team.id, form); }
    else { await base44.entities.Team.create(form); }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{team?.id ? t('edit') : t('createTeam')}</h2>
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('department')}</label>
              <input className={inputCls} value={form.department || ''} onChange={e => set('department', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('manager')}</label>
              <select className={inputCls} value={form.manager_email || ''} onChange={e => set('manager_email', e.target.value)}>
                <option value="">Select manager</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
              </select>
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