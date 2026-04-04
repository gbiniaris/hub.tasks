import { format, subDays, startOfDay, differenceInDays } from 'date-fns';

// Group tasks by a date field into daily buckets for the last N days
export function buildTrend(tasks, days = 30, dateField = 'created_date') {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i));
    const label = format(date, 'MMM d');
    const count = tasks.filter(t => {
      if (!t[dateField]) return false;
      const d = startOfDay(new Date(t[dateField]));
      return d.getTime() === date.getTime();
    }).length;
    result.push({ date: label, count });
  }
  return result;
}

// Completion trend: tasks marked done per day
export function buildCompletionTrend(tasks, days = 14) {
  return buildTrend(tasks.filter(t => t.status === 'done'), days, 'updated_date');
}

// Group by a field and count
export function groupAndCount(items, field) {
  const map = {};
  items.forEach(item => {
    const key = item[field] || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

// Compute on-time vs late completion
export function computeSLAMetrics(tasks) {
  const done = tasks.filter(t => t.status === 'done' && t.due_date);
  const onTime = done.filter(t => new Date(t.updated_date) <= new Date(t.due_date)).length;
  const late = done.length - onTime;
  const rate = done.length ? Math.round((onTime / done.length) * 100) : 0;
  return { total: done.length, onTime, late, rate };
}

// Average days to complete a task
export function avgCompletionDays(tasks) {
  const done = tasks.filter(t => t.status === 'done' && t.created_date && t.updated_date);
  if (!done.length) return 0;
  const total = done.reduce((sum, t) => sum + differenceInDays(new Date(t.updated_date), new Date(t.created_date)), 0);
  return Math.round(total / done.length);
}

// Workload map: email → task count
export function buildWorkloadMap(tasks) {
  const map = {};
  tasks.forEach(t => {
    if (t.assigned_to_email) map[t.assigned_to_email] = (map[t.assigned_to_email] || 0) + 1;
  });
  return Object.entries(map)
    .map(([email, count]) => ({ name: email.split('@')[0], email, count }))
    .sort((a, b) => b.count - a.count);
}