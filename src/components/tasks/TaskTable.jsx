import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, ExternalLink, AlertCircle } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import PriorityBadge from '../PriorityBadge';
import { useI18n } from '../../lib/i18n';
import { format } from 'date-fns';

export default function TaskTable({ tasks, onTaskClick, loading }) {
  const { t } = useI18n();
  const [sort, setSort] = useState({ field: 'updated_date', dir: 'desc' });

  const toggleSort = (field) => setSort(prev =>
    prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }
  );

  const sorted = [...tasks].sort((a, b) => {
    const v1 = a[sort.field] ?? '';
    const v2 = b[sort.field] ?? '';
    const cmp = v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ChevronUp className="w-3.5 h-3.5 opacity-30" />;
    return sort.dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />;
  };

  const Th = ({ field, label }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
    >
      <span className="flex items-center gap-1">{label} <SortIcon field={field} /></span>
    </th>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">{t('loading')}</div>
  );
  if (!tasks.length) return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
      <AlertCircle className="w-8 h-8 opacity-30" />
      <span className="text-sm">{t('noResults')}</span>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <Th field="title" label={t('name')} />
            <Th field="status" label={t('status')} />
            <Th field="priority" label={t('priority')} />
            <Th field="assigned_to_email" label={t('assignee')} />
            <Th field="due_date" label={t('dueDate')} />
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map(task => (
            <tr
              key={task.id}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onTaskClick?.(task)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {task.is_overdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className="font-medium text-foreground truncate max-w-xs">{task.title}</span>
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
              <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {task.assigned_to_email ? task.assigned_to_email.split('@')[0] : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {task.due_date ? (
                  <span className={task.is_overdue ? 'text-red-600 font-semibold' : ''}>
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/tasks/${task.id}`}
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground inline-flex transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}