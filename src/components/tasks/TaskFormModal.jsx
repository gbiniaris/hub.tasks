import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { base44 } from '../../api/base44Client';
import { Button } from '../ui/button';

const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

export default function TaskFormModal({ task, projectId, onClose, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    title: '', description: '', status: 'backlog', priority: 'medium',
    project_id: projectId || '', assigned_to_email: '', due_date: '',
    estimated_hours: '', tags: [],
    ...task,
  });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-updated_date', 100),
      base44.entities.User.list('-updated_date', 100),
      base44.entities.TaskCategory.filter({ is_active: true }),
      base44.entities.TaskType.filter({ is_active: true }),
    ]).then(([p, u, c, ty]) => { setProjects(p); setUsers(u); setCategories(c); setTypes(ty); }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined };
    if (!data.due_date) delete data.due_date;
    if (task?.id) {
      await base44.entities.Task.update(task.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    setSaving(false);
    onSave?.();
  };

  const Field = ({ label, children, required }) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{task?.id ? t('edit') : t('createTask')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <Field label={t('taskTitle')} required>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} required />
          </Field>

          <Field label={t('description')}>
            <textarea className={`${inputCls} h-20 resize-none`} value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('project')} required>
              <select className={inputCls} value={form.project_id} onChange={e => set('project_id', e.target.value)} required>
                <option value="">{t('selectProject')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t('assignee')}>
              <select className={inputCls} value={form.assigned_to_email || ''} onChange={e => set('assigned_to_email', e.target.value)}>
                <option value="">{t('selectAssignee')}</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.full_name || u.email}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('status')}>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label={t('priority')}>
              <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('dueDate')}>
              <input type="date" className={inputCls} value={form.due_date ? form.due_date.split('T')[0] : ''} onChange={e => set('due_date', e.target.value)} />
            </Field>
            <Field label={t('estimatedHours')}>
              <input type="number" className={inputCls} value={form.estimated_hours || ''} onChange={e => set('estimated_hours', e.target.value)} min="0" step="0.5" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('category')}>
              <select className={inputCls} value={form.category_id || ''} onChange={e => set('category_id', e.target.value)}>
                <option value="">{t('category')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('type')}>
              <select className={inputCls} value={form.type_id || ''} onChange={e => set('type_id', e.target.value)}>
                <option value="">{t('type')}</option>
                {types.map(ty => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
              </select>
            </Field>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}