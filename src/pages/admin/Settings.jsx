import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Check } from 'lucide-react';
import { base44 } from '../../api/base44Client';
import { useI18n } from '../../lib/i18n';
import { useTheme, THEMES } from '../../lib/useTheme';
import { Button } from '../../components/ui/button';

const TASK_CATEGORIES = [
  { id: 'task_categories', label: 'Task Categories' },
  { id: 'task_types', label: 'Task Types' },
];

export default function Settings() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.TaskCategory.list(),
      base44.entities.TaskType.list(),
    ]).then(([c, ty]) => { setCategories(c); setTypes(ty); });
  }, []);

  const toggleActive = async (entity, item) => {
    await base44.entities[entity].update(item.id, { is_active: !item.is_active });
    if (entity === 'TaskCategory') setCategories(prev => prev.map(c => c.id === item.id ? { ...c, is_active: !c.is_active } : c));
    else setTypes(prev => prev.map(ty => ty.id === item.id ? { ...ty, is_active: !ty.is_active } : ty));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('settings')}</h1>
      </div>

      {/* Theme */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">{t('theme')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === th.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
            >
              <span className={`w-6 h-6 rounded-full border-2 ${th.id === 'white' ? 'bg-white border-slate-300' : th.id === 'blue' ? 'bg-blue-500 border-blue-600' : th.id === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-green-500 border-green-600'}`} />
              <span className="text-sm font-medium text-foreground">{t(`theme${th.label}`)}</span>
              {theme === th.id && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Task Categories */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Task Categories</h3>
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                <span className="text-sm font-medium text-foreground">{c.name}</span>
              </div>
              <button
                onClick={() => toggleActive('TaskCategory', c)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${c.is_active ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'}`}
              >
                {c.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Task Types */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Task Types</h3>
        <div className="space-y-2">
          {types.map(ty => (
            <div key={ty.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: ty.color }} />
                <span className="text-sm font-medium text-foreground">{ty.name}</span>
              </div>
              <button
                onClick={() => toggleActive('TaskType', ty)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${ty.is_active ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-700'}`}
              >
                {ty.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}