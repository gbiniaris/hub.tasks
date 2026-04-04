import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Clock, Calendar, User, Loader2, Paperclip, Plus, Send, Tag } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/button';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import TaskFormModal from '../components/tasks/TaskFormModal';
import { format } from 'date-fns';

const TABS = ['overview', 'comments', 'attachments', 'history', 'relatedTasks'];

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm text-foreground flex-1">{children}</div>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [task, setTask] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);

  const load = async () => {
    setLoading(true);
    const [tasks, me] = await Promise.all([
      base44.entities.Task.filter({ id }),
      base44.auth.me(),
    ]);
    const t = tasks[0];
    setTask(t);
    setUser(me);
    if (t) {
      const [c, a, h, s, col] = await Promise.all([
        base44.entities.TaskComment.filter({ task_id: id }),
        base44.entities.TaskAttachment.filter({ task_id: id }),
        base44.entities.TaskHistory.filter({ task_id: id }),
        base44.entities.Task.filter({ parent_task_id: id }),
        base44.entities.TaskCollaborator.filter({ task_id: id }),
      ]);
      setComments(c.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      setAttachments(a);
      setHistory(h.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setSubtasks(s);
      setCollaborators(col);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    await base44.entities.TaskComment.create({ task_id: id, author_email: user.email, content: newComment });
    setNewComment('');
    const c = await base44.entities.TaskComment.filter({ task_id: id });
    setComments(c.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    setSending(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.TaskAttachment.create({ task_id: id, file_url, file_name: file.name, file_size: file.size, file_type: file.type, uploaded_by_email: user.email });
    const a = await base44.entities.TaskAttachment.filter({ task_id: id });
    setAttachments(a);
    setUploading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!task) return <div className="text-center text-muted-foreground py-20">Task not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="mt-1 p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={task.status} size="md" />
              <PriorityBadge priority={task.priority} />
              {task.is_overdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Overdue</span>}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
          <Edit className="w-4 h-4" /> {t('edit')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(tab)}
            {tab === 'comments' && comments.length > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">{comments.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {task.description && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{t('description')}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              {subtasks.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{t('subtasks')} ({subtasks.length})</h3>
                  <div className="space-y-2">
                    {subtasks.map(s => (
                      <Link key={s.id} to={`/tasks/${s.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                        <StatusBadge status={s.status} />
                        <span className="text-sm text-foreground">{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {task.tags?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />{t('tags')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 text-xs bg-muted text-muted-foreground rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {comments.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{t('noComments')}</p>}
                {comments.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {c.author_email?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{c.author_email}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{format(new Date(c.created_date), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap pl-9">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.full_name?.charAt(0)}
                </div>
                <div className="flex-1 flex gap-2">
                  <textarea
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder={t('addComment')}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendComment(); }}
                  />
                  <Button onClick={sendComment} disabled={sending || !newComment.trim()} size="icon">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  {t('uploadFile')}
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              {attachments.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">{t('noAttachments')}</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map(a => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:bg-accent transition-colors">
                      <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.file_name}</p>
                        <p className="text-xs text-muted-foreground">{a.file_size ? `${(a.file_size / 1024).toFixed(1)} KB` : ''}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">{t('noHistory')}</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{h.changed_by_email?.split('@')[0]}</span>
                          {' changed '}<span className="font-medium">{h.field_name}</span>
                          {h.old_value && <> from <span className="text-muted-foreground">"{h.old_value}"</span></>}
                          {h.new_value && <> to <span className="font-medium">"{h.new_value}"</span></>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(h.created_date), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'relatedTasks' && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground text-center py-6">{t('noResults')}</p>
            </div>
          )}
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <InfoRow icon={User} label={t('assignee')}>
              {task.assigned_to_email ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {task.assigned_to_email.charAt(0).toUpperCase()}
                  </div>
                  <span>{task.assigned_to_email.split('@')[0]}</span>
                </div>
              ) : <span className="text-muted-foreground">—</span>}
            </InfoRow>
            <InfoRow icon={Calendar} label={t('dueDate')}>
              {task.due_date ? (
                <span className={task.is_overdue ? 'text-red-600 font-semibold' : ''}>
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                </span>
              ) : <span className="text-muted-foreground">—</span>}
            </InfoRow>
            <InfoRow icon={Calendar} label={t('startDate')}>
              {task.start_date ? format(new Date(task.start_date), 'MMM d, yyyy') : <span className="text-muted-foreground">—</span>}
            </InfoRow>
            <InfoRow icon={Clock} label={t('estimatedHours')}>
              {task.estimated_hours ?? <span className="text-muted-foreground">—</span>}
            </InfoRow>
            <InfoRow icon={Clock} label={t('actualHours')}>
              {task.actual_hours ?? <span className="text-muted-foreground">—</span>}
            </InfoRow>
          </div>

          {collaborators.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('collaborators')}</h3>
              <div className="space-y-2">
                {collaborators.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                      {c.user_email?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{c.user_email?.split('@')[0]}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <TaskFormModal
          task={task}
          onClose={() => setEditing(false)}
          onSave={() => { setEditing(false); load(); }}
        />
      )}
    </div>
  );
}