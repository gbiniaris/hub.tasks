import { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { base44 } from '../../api/base44Client';
import { Button } from '../ui/button';

const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

export default function TaskFilters({ filters, onChange }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-updated_date', 100),
      base44.entities.Team.list('-updated_date', 50),
      base44.entities.User.list('-updated_date', 100),
    ]).then(([p, te, u]) => { setProjects(p); setTeams(te); setUsers(u); }).catch(() => {});
  }, []);

  const set = (key, val) => onChange({ ...filters, [key]: val });
  const clear = () => onChange({});
  const hasFilters = Object.values(filters).some(v => v);

  const Select = ({ label, value, onChange: onC, options }) => (
    <select
      value={value || ''}
      onChange={e => onC(e.target.value || '')}
      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <Filter className="w-4 h-4" />
        <span>{t('filterBy')}</span>
      </div>

      <Select label={t('allStatuses')} value={filters.status} onChange={v => set('status', v)}
        options={STATUSES.map(s => ({ value: s, label: t(s.replace('_', '')) || s }))} />

      <Select label={t('allPriorities')} value={filters.priority} onChange={v => set('priority', v)}
        options={PRIORITIES.map(p => ({ value: p, label: t(p) || p }))} />

      <Select label={t('allProjects')} value={filters.project_id} onChange={v => set('project_id', v)}
        options={projects.map(p => ({ value: p.id, label: p.name }))} />

      <Select label={t('allTeams')} value={filters.team_id} onChange={v => set('team_id', v)}
        options={teams.map(te => ({ value: te.id, label: te.name }))} />

      <Select label={t('allUsers')} value={filters.assigned_to_email} onChange={v => set('assigned_to_email', v)}
        options={users.map(u => ({ value: u.email, label: u.full_name || u.email }))} />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1.5 text-muted-foreground">
          <X className="w-3.5 h-3.5" /> {t('clearFilters')}
        </Button>
      )}
    </div>
  );
}