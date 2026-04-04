export const STATUS_CONFIG = {
  backlog:     { label: 'Backlog',      className: 'bg-slate-100 text-slate-600' },
  todo:        { label: 'To Do',        className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress',  className: 'bg-amber-100 text-amber-700' },
  in_review:   { label: 'In Review',    className: 'bg-purple-100 text-purple-700' },
  blocked:     { label: 'Blocked',      className: 'bg-red-100 text-red-700' },
  done:        { label: 'Done',         className: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelled',    className: 'bg-slate-100 text-slate-400 line-through' },
  // project statuses
  planning:    { label: 'Planning',     className: 'bg-sky-100 text-sky-700' },
  active:      { label: 'Active',       className: 'bg-green-100 text-green-700' },
  on_hold:     { label: 'On Hold',      className: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completed',    className: 'bg-indigo-100 text-indigo-700' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${size === 'sm' ? 'text-xs' : 'text-sm px-3 py-1'} ${config.className}`}>
      {config.label}
    </span>
  );
}