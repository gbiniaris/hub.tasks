import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users as UsersIcon } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';

const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-700',
  admin: 'bg-purple-100 text-purple-700',
  project_manager: 'bg-blue-100 text-blue-700',
  team_manager: 'bg-indigo-100 text-indigo-700',
  team_lead: 'bg-cyan-100 text-cyan-700',
  contributor: 'bg-green-100 text-green-700',
  viewer: 'bg-slate-100 text-slate-600',
};

export default function Users() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { base44.entities.User.list('-created_date', 200).catch(() => []).then(setUsers); }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('users')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} users</p>
        </div>
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
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
        >
          <option value="">{t('allRoles')}</option>
          {['super_admin', 'admin', 'project_manager', 'team_manager', 'team_lead', 'contributor', 'viewer'].map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <UsersIcon className="w-10 h-10 opacity-30 mx-auto mb-2" />
            {t('noResults')}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('email')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('role')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('department')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <Link to={`/users/${u.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                          {u.full_name || '—'}
                        </Link>
                        {u.job_title && <p className="text-xs text-muted-foreground">{u.job_title}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                      {u.role?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' || !u.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}