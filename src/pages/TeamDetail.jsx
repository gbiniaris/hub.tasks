import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [responsibilities, setResponsibilities] = useState([]);

  const load = async () => {
    setLoading(true);
    const [tms, mem, resp] = await Promise.all([
      base44.entities.Team.filter({ id }),
      base44.entities.TeamMembership.filter({ team_id: id, status: 'active' }),
      base44.entities.Responsibility.filter({ team_id: id }),
    ]);
    setTeam(tms[0]);
    setMembers(mem);
    setResponsibilities(resp);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const removeMember = async (memberId) => {
    await base44.entities.TeamMembership.update(memberId, { status: 'inactive' });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!team) return <div className="text-center text-muted-foreground py-20">Team not found</div>;

  const ROLE_COLORS = { manager: 'bg-purple-100 text-purple-700', lead: 'bg-blue-100 text-blue-700', member: 'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/teams')} className="mt-1 p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
            {team.department && <p className="text-sm text-muted-foreground mt-0.5">{team.department}</p>}
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> {t('addMember')}
        </Button>
      </div>

      {team.description && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground">{team.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{t('members')} ({members.length})</h3>
          </div>
          {members.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No members yet</div>
          ) : (
            <div className="divide-y divide-border">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {m.user_email?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.user_email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground">{m.user_email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role_in_team] || ROLE_COLORS.member}`}>
                    {m.role_in_team}
                  </span>
                  <button onClick={() => removeMember(m.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Responsibilities */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">{t('responsibilities')} ({responsibilities.length})</h3>
          </div>
          {responsibilities.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No responsibilities defined</div>
          ) : (
            <div className="divide-y divide-border">
              {responsibilities.map(r => (
                <div key={r.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-foreground">{r.name}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.priority === 'critical' ? 'bg-red-100 text-red-700' : r.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                      {r.priority}
                    </span>
                    {r.assigned_to_email && <span className="text-xs text-muted-foreground">{r.assigned_to_email.split('@')[0]}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddMemberModal teamId={id} onClose={() => setShowAddModal(false)} onSave={() => { setShowAddModal(false); load(); }} />}
    </div>
  );
}

function AddMemberModal({ teamId, onClose, onSave }) {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_email: '', role_in_team: 'member' });
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => { base44.entities.User.list().then(setUsers); }, []);

  const submit = async () => {
    if (!form.user_email) return;
    setSaving(true);
    await base44.entities.TeamMembership.create({ ...form, team_id: teamId, joined_date: new Date().toISOString(), status: 'active' });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">{t('addMember')}</h2>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('users')}</label>
          <select className={inputCls} value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))}>
            <option value="">Select user</option>
            {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('role')}</label>
          <select className={inputCls} value={form.role_in_team} onChange={e => setForm(f => ({ ...f, role_in_team: e.target.value }))}>
            <option value="manager">Manager</option>
            <option value="lead">Lead</option>
            <option value="member">Member</option>
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={submit} disabled={saving}>{t('save')}</Button>
        </div>
      </div>
    </div>
  );
}