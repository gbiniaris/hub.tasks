import { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { base44 } from '../../api/base44Client';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { format } from 'date-fns';

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const { t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AuditLog.list('-created_date', 200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    const matchAction = !actionFilter || l.action === actionFilter;
    const matchEntity = !entityFilter || l.entity_type?.toLowerCase().includes(entityFilter.toLowerCase());
    return matchAction && matchEntity;
  });

  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('auditLog')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} entries</p>
          </div>
        </div>
        <Button variant="outline" onClick={load} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
        >
          <option value="">All Entities</option>
          {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t('noResults')}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Performed By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{log.entity_type}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{log.performed_by_email?.split('@')[0] || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">{log.description || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {log.created_date ? format(new Date(log.created_date), 'MMM d, HH:mm') : '—'}
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