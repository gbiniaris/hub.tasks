import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import PriorityBadge from '../components/PriorityBadge';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';

export default function CalendarView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    base44.entities.Task.filter({ status: { $nin: ['cancelled'] } })
      .then(data => setTasks(data.filter(t => t.due_date)))
      .catch(() => {});
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const getTasksForDay = (day) => tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), day));
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('calendar')}</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground w-36 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border" style={{ gridAutoRows: '120px' }}>
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            return (
              <div key={i} className={`p-1.5 overflow-hidden ${!inMonth ? 'bg-muted/20' : ''}`}>
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                  today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className={`text-xs px-1.5 py-0.5 rounded font-medium cursor-pointer truncate transition-opacity hover:opacity-80 ${
                        task.is_overdue ? 'bg-red-100 text-red-700' :
                        task.status === 'done' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1.5">+{dayTasks.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}