import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import PriorityBadge from '../components/PriorityBadge';
import { format } from 'date-fns';

export default function ApprovalQueue() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Task.filter({ status: 'in_review' });
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (task) => {
    await base44.entities.Task.update(task.id, { status: 'done', completion_percentage: 100 });
    load();
  };
  const reject = async (task) => {
    await base44.entities.Task.update(task.id, { status: 'in_progress' });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('approvals')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} tasks awaiting review</p>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <CheckCircle className="w-12 h-12 opacity-30" />
          <p className="text-sm">No tasks awaiting approval</p>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
            <Clock className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <PriorityBadge priority={task.priority} />
                    {task.assigned_to_email && (
                      <span className="text-xs text-muted-foreground">by {task.assigned_to_email.split('@')[0]}</span>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">Due {format(new Date(task.due_date), 'MMM d')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => reject(task)} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => approve(task)} className="gap-1.5 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                </div>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}